/**
 * GPU hardware configuration.
 * Values are set by scripts/detect-gpu.sh at container startup
 * and injected as environment variables into all services.
 * Defaults always fall back to CPU-only mode (safe for dev machines).
 */
export const gpuConfig = {
  /** Whether a discrete GPU was detected at startup */
  get available(): boolean {
    return process.env['GPU_AVAILABLE'] === 'true';
  },

  /** Detected GPU vendor */
  get vendor(): 'nvidia' | 'amd' | 'none' {
    const v = process.env['GPU_VENDOR'] ?? 'none';
    if (v === 'nvidia' || v === 'amd') return v;
    return 'none';
  },

  /** GPU VRAM in megabytes (0 if no GPU or unknown) */
  get vramMb(): number {
    return parseInt(process.env['GPU_VRAM_MB'] ?? '0', 10);
  },

  /**
   * Ollama GPU layer count.
   * undefined → Ollama auto-detects (use when GPU available)
   * '0' → Force CPU-only inference
   */
  get ollamaNumGpu(): string | undefined {
    const val = process.env['OLLAMA_NUM_GPU'];
    // Empty string or '0' are both valid explicit settings
    if (val === undefined) return undefined;
    if (val === '') return undefined; // empty = Ollama auto-detect (GPU mode)
    return val; // '0' = CPU forced
  },

  /** Whisper inference device */
  get whisperDevice(): 'cpu' | 'cuda' {
    const d = process.env['WHISPER_DEVICE'] ?? 'cpu';
    return d === 'cuda' ? 'cuda' : 'cpu';
  },

  /** Human-readable summary for structured logging */
  get summary(): string {
    if (!this.available) return 'CPU-only';
    return `GPU:${this.vendor.toUpperCase()} VRAM:${this.vramMb}MB`;
  },
} as const;
