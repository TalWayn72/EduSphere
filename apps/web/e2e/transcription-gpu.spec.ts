/**
 * Transcription GPU/CPU mode E2E tests.
 *
 * Verifies that the whisper-server /health endpoint reports device mode,
 * and that the transcription pipeline handles both CPU and GPU configurations.
 *
 * These tests run in CPU mode in CI (no GPU required).
 * The whisper-server tests gracefully skip when the server is not running.
 *
 * Run locally:
 *   pnpm --filter @edusphere/web test:e2e --grep="Whisper Server"
 *
 * Run against GPU-enabled env:
 *   GPU_AVAILABLE=true GPU_VENDOR=nvidia GPU_VRAM_MB=8192 \
 *   WHISPER_DEVICE=cuda WHISPER_URL=http://localhost:3200 \
 *   pnpm --filter @edusphere/web test:e2e --grep="Whisper Server"
 */

import { type APIRequestContext, expect, test } from '@playwright/test';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WhisperHealthResponse {
  status: string;
  device: string;
  model_size: string;
  cuda_available: boolean;
  compute_type?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WHISPER_URL = process.env['WHISPER_URL'] ?? 'http://localhost:3200';

/**
 * Attempt to reach the whisper-server health endpoint.
 * Returns the parsed body or null if the server is not reachable.
 */
async function tryWhisperHealth(
  requestContext: APIRequestContext,
): Promise<WhisperHealthResponse | null> {
  try {
    const response = await requestContext.get(`${WHISPER_URL}/health`, {
      timeout: 5_000,
    });
    if (!response.ok()) return null;
    return (await response.json()) as WhisperHealthResponse;
  } catch {
    return null;
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Whisper Server — Hardware Mode', () => {
  test('whisper-server health endpoint reports device type', async ({
    request,
  }) => {
    const body = await tryWhisperHealth(request);

    if (body === null) {
      // whisper-server not running in this environment — skip gracefully
      test.skip();
      return;
    }

    // Status must be "ok"
    expect(body.status).toBe('ok');

    // Device must be a valid faster-whisper value
    expect(['cpu', 'cuda']).toContain(body.device);

    // Model size must be present
    expect(body.model_size).toBeTruthy();

    // GPU env vars must match what the server actually detected
    const gpuAvailable = process.env['GPU_AVAILABLE'] === 'true';
    if (gpuAvailable) {
      expect(body.device).toBe('cuda');
      expect(body.cuda_available).toBe(true);
    } else {
      expect(body.device).toBe('cpu');
    }
  });

  test('whisper-server CPU mode uses base model size', async ({ request }) => {
    const body = await tryWhisperHealth(request);

    if (body === null) {
      test.skip();
      return;
    }

    // Only assert in CPU mode (GPU_AVAILABLE not set or false)
    const gpuAvailable = process.env['GPU_AVAILABLE'] === 'true';
    if (gpuAvailable) {
      // GPU mode — skip this specific assertion
      test.skip();
      return;
    }

    expect(body.device).toBe('cpu');
    // CPU mode defaults to 'base' unless WHISPER_MODEL_SIZE overrides
    const expectedModel = process.env['WHISPER_MODEL_SIZE'] ?? 'base';
    expect(body.model_size).toBe(expectedModel);
  });

  test('whisper-server GPU mode uses large-v3 model size', async ({
    request,
  }) => {
    const body = await tryWhisperHealth(request);

    if (body === null) {
      test.skip();
      return;
    }

    const gpuAvailable = process.env['GPU_AVAILABLE'] === 'true';
    if (!gpuAvailable) {
      // CPU env — skip GPU assertion
      test.skip();
      return;
    }

    expect(body.device).toBe('cuda');
    // GPU mode defaults to 'large-v3' unless WHISPER_MODEL_SIZE overrides
    const expectedModel = process.env['WHISPER_MODEL_SIZE'] ?? 'large-v3';
    expect(body.model_size).toBe(expectedModel);
  });

  test('whisper-server health response has required fields', async ({
    request,
  }) => {
    const body = await tryWhisperHealth(request);

    if (body === null) {
      test.skip();
      return;
    }

    // Structural contract — these fields must always be present
    expect(typeof body.status).toBe('string');
    expect(typeof body.device).toBe('string');
    expect(typeof body.model_size).toBe('string');
    expect(typeof body.cuda_available).toBe('boolean');
  });
});

test.describe('Whisper Server — GPU Environment Variables', () => {
  test('gpuConfig env vars are internally consistent', () => {
    const gpuAvailable = process.env['GPU_AVAILABLE'] === 'true';
    const gpuVendor = process.env['GPU_VENDOR'] ?? 'none';
    const whisperDevice = process.env['WHISPER_DEVICE'] ?? 'cpu';

    if (gpuAvailable) {
      // When GPU is available, vendor must be nvidia or amd
      expect(gpuVendor).toMatch(/^(nvidia|amd)$/);
      // Whisper device must be cuda when GPU is available
      expect(whisperDevice).toBe('cuda');
    } else {
      // CPU-only mode
      expect(gpuVendor).toBe('none');
      expect(whisperDevice).toBe('cpu');
    }
  });

  test('WHISPER_DEVICE value is valid for faster-whisper', () => {
    const whisperDevice = process.env['WHISPER_DEVICE'] ?? 'cpu';
    // faster-whisper only accepts 'cpu' or 'cuda' — never 'auto' or 'metal'
    expect(['cpu', 'cuda']).toContain(whisperDevice);
  });

  test('OLLAMA_NUM_GPU value is valid when set', () => {
    const ollamaNumGpu = process.env['OLLAMA_NUM_GPU'];
    if (ollamaNumGpu === undefined || ollamaNumGpu === '') {
      // undefined/empty means Ollama auto-detects — valid
      expect(true).toBe(true);
    } else {
      // When explicitly set, must be a non-negative integer string
      expect(ollamaNumGpu).toMatch(/^\d+$/);
    }
  });

  test('GPU_VRAM_MB is a non-negative integer when set', () => {
    const vramMb = process.env['GPU_VRAM_MB'];
    if (vramMb === undefined) {
      // Not set — defaults to 0 in gpuConfig — valid
      expect(true).toBe(true);
    } else {
      const parsed = parseInt(vramMb, 10);
      expect(isNaN(parsed)).toBe(false);
      expect(parsed).toBeGreaterThanOrEqual(0);
    }
  });
});
