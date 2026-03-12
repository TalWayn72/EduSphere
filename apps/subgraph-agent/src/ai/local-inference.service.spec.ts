import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { LocalInferenceService } from './local-inference.service.js';

// Mock ollama-ai-provider so no real HTTP call is made
vi.mock('ollama-ai-provider', () => ({
  createOllama: vi.fn(() => ({})),
}));

describe('LocalInferenceService', () => {
  let service: LocalInferenceService;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    service = new LocalInferenceService();
  });

  afterEach(() => {
    // Restore env after each test
    Object.assign(process.env, originalEnv);
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
  });

  // ── isAirgapped ─────────────────────────────────────────────────────────────

  it('isAirgapped() returns false by default (AIRGAP_MODE not set)', () => {
    delete process.env.AIRGAP_MODE;
    expect(service.isAirgapped()).toBe(false);
  });

  it('isAirgapped() returns true when AIRGAP_MODE=true', () => {
    process.env.AIRGAP_MODE = 'true';
    expect(service.isAirgapped()).toBe(true);
  });

  it('isAirgapped() returns false when AIRGAP_MODE=false', () => {
    process.env.AIRGAP_MODE = 'false';
    expect(service.isAirgapped()).toBe(false);
  });

  // ── enforceAirgapPolicy ─────────────────────────────────────────────────────

  it('enforceAirgapPolicy("openai") throws ForbiddenException when airgapped', () => {
    process.env.AIRGAP_MODE = 'true';
    expect(() => service.enforceAirgapPolicy('openai')).toThrow(
      ForbiddenException
    );
  });

  it('enforceAirgapPolicy("anthropic") throws ForbiddenException when airgapped', () => {
    process.env.AIRGAP_MODE = 'true';
    expect(() => service.enforceAirgapPolicy('anthropic')).toThrow(
      ForbiddenException
    );
  });

  it('enforceAirgapPolicy("openai") does NOT throw when not airgapped', () => {
    delete process.env.AIRGAP_MODE;
    expect(() => service.enforceAirgapPolicy('openai')).not.toThrow();
  });

  it('enforceAirgapPolicy("ollama") never throws regardless of airgap mode', () => {
    process.env.AIRGAP_MODE = 'true';
    expect(() => service.enforceAirgapPolicy('ollama')).not.toThrow();
  });

  it('enforceAirgapPolicy("ollama") does not throw when not airgapped', () => {
    delete process.env.AIRGAP_MODE;
    expect(() => service.enforceAirgapPolicy('ollama')).not.toThrow();
  });

  // ── createOllamaClient ──────────────────────────────────────────────────────

  it('createOllamaClient() returns a client object', () => {
    const client = service.createOllamaClient();
    expect(client).toBeDefined();
  });

  // ── onModuleDestroy ─────────────────────────────────────────────────────────

  it('onModuleDestroy() does not throw', () => {
    expect(() => service.onModuleDestroy()).not.toThrow();
  });
});
