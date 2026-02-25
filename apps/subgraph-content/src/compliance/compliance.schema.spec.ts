/**
 * compliance.schema.spec.ts — SDL integrity tests
 *
 * These tests guard against regressions introduced by BUG-004:
 *   - Duplicate `extend schema @link(...)` declarations broke Federation composition.
 *   - Missing `complianceCourses` in the Query type caused a red runtime error.
 *
 * This suite reads the raw .graphql file and validates its structure so that
 * any accidental reintroduction of these patterns is caught before deployment.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SDL = readFileSync(join(__dirname, 'compliance.graphql'), 'utf-8');

describe('compliance.graphql SDL integrity — BUG-004 regression', () => {
  // ── Federation schema directive ────────────────────────────────────────────

  it('does NOT contain "extend schema @link" (would duplicate the gateway-level directive)', () => {
    const matches = SDL.match(/extend\s+schema\s+@link/g) ?? [];
    expect(
      matches.length,
      'Found duplicate "extend schema @link" — this breaks Federation v2 composition (BUG-004)',
    ).toBe(0);
  });

  // ── Required Query fields ─────────────────────────────────────────────────

  it('exposes "complianceCourses" as a Query field', () => {
    expect(SDL).toMatch(/complianceCourses\s*:/);
  });

  it('"complianceCourses" returns a non-null list', () => {
    expect(SDL).toMatch(/complianceCourses\s*:\s*\[ComplianceCourse!\]!/);
  });

  it('"complianceCourses" has @authenticated directive', () => {
    // The field must require authentication — security invariant
    expect(SDL).toMatch(/complianceCourses[^}]+@authenticated/s);
  });

  // ── Required Mutation fields ──────────────────────────────────────────────

  it('exposes "generateComplianceReport" mutation', () => {
    expect(SDL).toMatch(/generateComplianceReport\s*\(/);
  });

  it('"generateComplianceReport" accepts courseIds and optional asOf', () => {
    expect(SDL).toMatch(/courseIds\s*:\s*\[ID!\]!/);
    expect(SDL).toMatch(/asOf\s*:\s*String/);
  });

  it('exposes "updateCourseComplianceSettings" mutation', () => {
    expect(SDL).toMatch(/updateCourseComplianceSettings\s*\(/);
  });

  // ── Required types ────────────────────────────────────────────────────────

  it('defines ComplianceCourse type with required fields', () => {
    expect(SDL).toMatch(/type\s+ComplianceCourse\s*\{/);
    expect(SDL).toMatch(/id\s*:\s*ID!/);
    expect(SDL).toMatch(/title\s*:\s*String!/);
    expect(SDL).toMatch(/isCompliance\s*:\s*Boolean!/);
    expect(SDL).toMatch(/isPublished\s*:\s*Boolean!/);
  });

  it('defines ComplianceSummary type with all stat fields', () => {
    expect(SDL).toMatch(/type\s+ComplianceSummary\s*\{/);
    expect(SDL).toMatch(/totalEnrollments\s*:\s*Int!/);
    expect(SDL).toMatch(/completionRate\s*:\s*Float!/);
    expect(SDL).toMatch(/overdueCount\s*:\s*Int!/);
    expect(SDL).toMatch(/generatedAt\s*:\s*String!/);
  });

  it('defines ComplianceReportResult with csvUrl and pdfUrl', () => {
    expect(SDL).toMatch(/type\s+ComplianceReportResult\s*\{/);
    expect(SDL).toMatch(/csvUrl\s*:\s*String!/);
    expect(SDL).toMatch(/pdfUrl\s*:\s*String!/);
    expect(SDL).toMatch(/summary\s*:\s*ComplianceSummary!/);
  });

  // ── No escaped syntax errors ──────────────────────────────────────────────

  it('does not contain backslash-escaped exclamation marks (\\!)', () => {
    // BUG-006 pattern: escaped `!` breaks SDL parsing
    expect(SDL).not.toContain('\\!');
  });

  // ── Structural integrity ──────────────────────────────────────────────────

  it('uses "extend type Query" (not bare "type Query")', () => {
    // Federation subgraphs extend the root Query type
    expect(SDL).toMatch(/extend\s+type\s+Query/);
    expect(SDL).not.toMatch(/^type\s+Query\s*\{/m);
  });

  it('uses "extend type Mutation" (not bare "type Mutation")', () => {
    expect(SDL).toMatch(/extend\s+type\s+Mutation/);
    expect(SDL).not.toMatch(/^type\s+Mutation\s*\{/m);
  });
});
