/**
 * Unit tests for packages/config/src/gpu.ts
 *
 * gpuConfig uses getter properties that read process.env at call time,
 * so we can control values by setting env vars before each assertion.
 *
 * Coverage:
 *   - available  — default false, true only for "true", false for anything else
 *   - vendor     — default "none", valid "nvidia"/"amd", unknown falls back to "none"
 *   - vramMb     — default 0, parsed as integer
 *   - ollamaNumGpu — undefined when absent/empty, string value when present
 *   - whisperDevice — default "cpu", "cuda" when set, unknown falls back to "cpu"
 *   - summary    — "CPU-only" vs "GPU:<VENDOR> VRAM:<N>MB"
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gpuConfig } from '../gpu.js';

describe('gpuConfig', () => {
  // Capture original env so we can fully restore it after each test
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Remove GPU-related vars so each test starts from a clean state
    delete process.env['GPU_AVAILABLE'];
    delete process.env['GPU_VENDOR'];
    delete process.env['GPU_VRAM_MB'];
    delete process.env['OLLAMA_NUM_GPU'];
    delete process.env['WHISPER_DEVICE'];
  });

  afterEach(() => {
    // Restore the original environment
    // Remove anything added during the test first
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  // ─── available ──────────────────────────────────────────────────────────────

  describe('available', () => {
    it('defaults to false when GPU_AVAILABLE is not set', () => {
      expect(gpuConfig.available).toBe(false);
    });

    it('returns true when GPU_AVAILABLE is "true"', () => {
      process.env['GPU_AVAILABLE'] = 'true';
      expect(gpuConfig.available).toBe(true);
    });

    it('returns false when GPU_AVAILABLE is "false"', () => {
      process.env['GPU_AVAILABLE'] = 'false';
      expect(gpuConfig.available).toBe(false);
    });

    it('returns false for "yes" (not a valid truthy string)', () => {
      process.env['GPU_AVAILABLE'] = 'yes';
      expect(gpuConfig.available).toBe(false);
    });

    it('returns false for "1" (only exact "true" is accepted)', () => {
      process.env['GPU_AVAILABLE'] = '1';
      expect(gpuConfig.available).toBe(false);
    });
  });

  // ─── vendor ─────────────────────────────────────────────────────────────────

  describe('vendor', () => {
    it('defaults to "none" when GPU_VENDOR is not set', () => {
      expect(gpuConfig.vendor).toBe('none');
    });

    it('returns "nvidia" when GPU_VENDOR is "nvidia"', () => {
      process.env['GPU_VENDOR'] = 'nvidia';
      expect(gpuConfig.vendor).toBe('nvidia');
    });

    it('returns "amd" when GPU_VENDOR is "amd"', () => {
      process.env['GPU_VENDOR'] = 'amd';
      expect(gpuConfig.vendor).toBe('amd');
    });

    it('returns "none" for unknown vendor "intel"', () => {
      process.env['GPU_VENDOR'] = 'intel';
      expect(gpuConfig.vendor).toBe('none');
    });

    it('returns "none" for empty string vendor', () => {
      process.env['GPU_VENDOR'] = '';
      expect(gpuConfig.vendor).toBe('none');
    });
  });

  // ─── vramMb ─────────────────────────────────────────────────────────────────

  describe('vramMb', () => {
    it('defaults to 0 when GPU_VRAM_MB is not set', () => {
      expect(gpuConfig.vramMb).toBe(0);
    });

    it('parses GPU_VRAM_MB as an integer', () => {
      process.env['GPU_VRAM_MB'] = '8192';
      expect(gpuConfig.vramMb).toBe(8192);
    });

    it('parses large VRAM values correctly', () => {
      process.env['GPU_VRAM_MB'] = '24576';
      expect(gpuConfig.vramMb).toBe(24576);
    });

    it('returns 0 when GPU_VRAM_MB is "0"', () => {
      process.env['GPU_VRAM_MB'] = '0';
      expect(gpuConfig.vramMb).toBe(0);
    });
  });

  // ─── ollamaNumGpu ────────────────────────────────────────────────────────────

  describe('ollamaNumGpu', () => {
    it('returns undefined when OLLAMA_NUM_GPU is not set', () => {
      expect(gpuConfig.ollamaNumGpu).toBeUndefined();
    });

    it('returns undefined when OLLAMA_NUM_GPU is empty string (GPU auto-detect)', () => {
      process.env['OLLAMA_NUM_GPU'] = '';
      expect(gpuConfig.ollamaNumGpu).toBeUndefined();
    });

    it('returns "0" when OLLAMA_NUM_GPU is "0" (force CPU)', () => {
      process.env['OLLAMA_NUM_GPU'] = '0';
      expect(gpuConfig.ollamaNumGpu).toBe('0');
    });

    it('returns "1" when OLLAMA_NUM_GPU is "1"', () => {
      process.env['OLLAMA_NUM_GPU'] = '1';
      expect(gpuConfig.ollamaNumGpu).toBe('1');
    });

    it('returns "99" when OLLAMA_NUM_GPU is "99"', () => {
      process.env['OLLAMA_NUM_GPU'] = '99';
      expect(gpuConfig.ollamaNumGpu).toBe('99');
    });
  });

  // ─── whisperDevice ──────────────────────────────────────────────────────────

  describe('whisperDevice', () => {
    it('defaults to "cpu" when WHISPER_DEVICE is not set', () => {
      expect(gpuConfig.whisperDevice).toBe('cpu');
    });

    it('returns "cuda" when WHISPER_DEVICE is "cuda"', () => {
      process.env['WHISPER_DEVICE'] = 'cuda';
      expect(gpuConfig.whisperDevice).toBe('cuda');
    });

    it('returns "cpu" when WHISPER_DEVICE is "cpu"', () => {
      process.env['WHISPER_DEVICE'] = 'cpu';
      expect(gpuConfig.whisperDevice).toBe('cpu');
    });

    it('returns "cpu" for unknown value "metal" (Apple Silicon not supported)', () => {
      process.env['WHISPER_DEVICE'] = 'metal';
      expect(gpuConfig.whisperDevice).toBe('cpu');
    });

    it('returns "cpu" for unknown value "auto"', () => {
      // "auto" is handled by whisper-server config.py, not the TS gpuConfig
      process.env['WHISPER_DEVICE'] = 'auto';
      expect(gpuConfig.whisperDevice).toBe('cpu');
    });
  });

  // ─── summary ────────────────────────────────────────────────────────────────

  describe('summary', () => {
    it('returns "CPU-only" when no GPU is available', () => {
      expect(gpuConfig.summary).toBe('CPU-only');
    });

    it('returns GPU info string when GPU is available', () => {
      process.env['GPU_AVAILABLE'] = 'true';
      process.env['GPU_VENDOR'] = 'nvidia';
      process.env['GPU_VRAM_MB'] = '8192';
      expect(gpuConfig.summary).toBe('GPU:NVIDIA VRAM:8192MB');
    });

    it('returns AMD GPU info correctly', () => {
      process.env['GPU_AVAILABLE'] = 'true';
      process.env['GPU_VENDOR'] = 'amd';
      process.env['GPU_VRAM_MB'] = '16384';
      expect(gpuConfig.summary).toBe('GPU:AMD VRAM:16384MB');
    });

    it('returns GPU info with 0 VRAM when VRAM not set', () => {
      process.env['GPU_AVAILABLE'] = 'true';
      process.env['GPU_VENDOR'] = 'nvidia';
      // GPU_VRAM_MB not set — defaults to 0
      expect(gpuConfig.summary).toBe('GPU:NVIDIA VRAM:0MB');
    });
  });

  // ─── Integration: CPU-only defaults ─────────────────────────────────────────

  describe('CPU-only defaults (no env vars set)', () => {
    it('all properties return safe CPU-only defaults', () => {
      expect(gpuConfig.available).toBe(false);
      expect(gpuConfig.vendor).toBe('none');
      expect(gpuConfig.vramMb).toBe(0);
      expect(gpuConfig.ollamaNumGpu).toBeUndefined();
      expect(gpuConfig.whisperDevice).toBe('cpu');
      expect(gpuConfig.summary).toBe('CPU-only');
    });
  });

  // ─── Integration: Full GPU config ───────────────────────────────────────────

  describe('Full GPU config (NVIDIA)', () => {
    beforeEach(() => {
      process.env['GPU_AVAILABLE'] = 'true';
      process.env['GPU_VENDOR'] = 'nvidia';
      process.env['GPU_VRAM_MB'] = '8192';
      process.env['OLLAMA_NUM_GPU'] = '';
      process.env['WHISPER_DEVICE'] = 'cuda';
    });

    it('available is true', () => {
      expect(gpuConfig.available).toBe(true);
    });

    it('vendor is nvidia', () => {
      expect(gpuConfig.vendor).toBe('nvidia');
    });

    it('vramMb is 8192', () => {
      expect(gpuConfig.vramMb).toBe(8192);
    });

    it('ollamaNumGpu is undefined (auto-detect)', () => {
      expect(gpuConfig.ollamaNumGpu).toBeUndefined();
    });

    it('whisperDevice is cuda', () => {
      expect(gpuConfig.whisperDevice).toBe('cuda');
    });

    it('summary shows GPU details', () => {
      expect(gpuConfig.summary).toBe('GPU:NVIDIA VRAM:8192MB');
    });
  });
});
