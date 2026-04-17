/**
 * VoiceProfileHelper
 *
 * Utilities for loading, merging, and persisting instructor voice profiles.
 * Voice profiles capture per-instructor writing style for AI-driven polishing.
 *
 * Merge strategy: weighted blend (existing 70% / fresh 30%) once at least
 * MIN_SAMPLES lessons have been processed for the instructor.
 */
import { Logger } from '@nestjs/common';
import { db, schema, withTenantContext, eq, and } from '@edusphere/db';
import type { VoiceProfile } from '@edusphere/langgraph-workflows';

const logger = new Logger('VoiceProfileHelper');
const MIN_SAMPLES_FOR_BLEND = 2;
const EXISTING_WEIGHT = 0.7;
const FRESH_WEIGHT = 0.3;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load an existing voice profile for the instructor from the DB.
 * Returns null if none has been saved yet.
 */
export async function loadVoiceProfile(
  tenantId: string,
  instructorId: string,
): Promise<VoiceProfile | null> {
  try {
    const rows = await withTenantContext(
      db,
      { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' },
      async (txDb) =>
        txDb
          .select()
          .from(schema.instructor_voice_profiles)
          .where(
            and(
              eq(schema.instructor_voice_profiles.tenant_id, tenantId),
              eq(schema.instructor_voice_profiles.instructor_id, instructorId),
            ),
          )
          .limit(1),
    );
    if (!rows[0]?.voice_data) return null;
    return rows[0].voice_data as VoiceProfile;
  } catch (err) {
    logger.warn({ err, tenantId, instructorId }, 'Could not load voice profile');
    return null;
  }
}

/**
 * Merge an existing (persisted) voice profile with a freshly-extracted one.
 * When sampleCount < MIN_SAMPLES_FOR_BLEND the fresh profile wins entirely.
 */
export function mergeVoiceProfiles(
  existing: VoiceProfile | null,
  fresh: VoiceProfile,
  sampleCount: number,
): VoiceProfile {
  if (!existing || sampleCount < MIN_SAMPLES_FOR_BLEND) return fresh;

  const merged: VoiceProfile = {
    avgSentenceLength: pickDominant(
      existing.avgSentenceLength,
      fresh.avgSentenceLength,
    ) as VoiceProfile['avgSentenceLength'],
    formality: pickDominant(
      existing.formality,
      fresh.formality,
    ) as VoiceProfile['formality'],
    transitionPhrases: mergeStringArrays(
      existing.transitionPhrases,
      fresh.transitionPhrases,
    ),
    rhythmMarkers: mergeStringArrays(
      existing.rhythmMarkers,
      fresh.rhythmMarkers,
    ),
    raw: fresh.raw,
  };
  return merged;
}

/**
 * Upsert a voice profile for the given instructor.
 * On conflict (tenant_id, instructor_id): merges with existing and increments sample_count.
 */
export async function saveVoiceProfile(
  tenantId: string,
  instructorId: string,
  profile: VoiceProfile,
  lessonId: string,
): Promise<void> {
  try {
    await withTenantContext(
      db,
      { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' },
      async (txDb) => {
        const existing = await txDb
          .select({
            id: schema.instructor_voice_profiles.id,
            sampleCount: schema.instructor_voice_profiles.sample_count,
            voiceData: schema.instructor_voice_profiles.voice_data,
          })
          .from(schema.instructor_voice_profiles)
          .where(
            and(
              eq(schema.instructor_voice_profiles.tenant_id, tenantId),
              eq(schema.instructor_voice_profiles.instructor_id, instructorId),
            ),
          )
          .limit(1);

        if (existing.length === 0) {
          await txDb.insert(schema.instructor_voice_profiles).values({
            tenant_id: tenantId,
            instructor_id: instructorId,
            voice_data: profile as unknown as Record<string, unknown>,
            sample_count: 1,
            last_updated_from: lessonId,
          });
        } else {
          const prev = existing[0];
          const newCount = (prev.sampleCount ?? 1) + 1;
          const merged = mergeVoiceProfiles(
            prev.voiceData as VoiceProfile | null,
            profile,
            newCount,
          );
          await txDb
            .update(schema.instructor_voice_profiles)
            .set({
              voice_data: merged as unknown as Record<string, unknown>,
              sample_count: newCount,
              last_updated_from: lessonId,
            })
            .where(eq(schema.instructor_voice_profiles.id, prev.id));
        }
      },
    );
    logger.log({ tenantId, instructorId }, 'Voice profile saved');
  } catch (err) {
    logger.error({ err, tenantId, instructorId }, 'Failed to save voice profile');
    throw err;
  }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/** For ordinal-style string enums, pick the dominant value based on weight. */
function pickDominant(existing: string, fresh: string): string {
  // Simple: return existing (70% weight) unless fresh differs with high confidence.
  // In practice, existing profile wins for stability; only override if both agree.
  return existing === fresh ? existing : weightedPick(existing, fresh);
}

function weightedPick(a: string, b: string): string {
  return Math.random() < EXISTING_WEIGHT ? a : b;
}

/** Union merge: keep all unique strings from both arrays (existing first). */
function mergeStringArrays(existing: string[], fresh: string[]): string[] {
  const seen = new Set(existing);
  for (const s of fresh) seen.add(s);
  return Array.from(seen).slice(0, 20); // cap at 20 entries
}
