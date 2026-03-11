import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ForbiddenException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { createOllama } from 'ollama-ai-provider';

/**
 * LocalInferenceService — enforces air-gap mode (AIRGAP_MODE=true).
 *
 * When air-gapped:
 *   • Only Ollama provider is permitted — OpenAI / Anthropic calls are blocked.
 *   • On module init, the pinned model hash (AIRGAP_MODEL_HASH) is verified
 *     against the SHA-256 of the model identifier string.
 *
 * Memory safety: no persistent resources — onModuleDestroy is a no-op.
 */
@Injectable()
export class LocalInferenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LocalInferenceService.name);

  onModuleInit(): void {
    if (this.isAirgapped()) {
      this.verifyModelHash();
    }
  }

  onModuleDestroy(): void {
    // No persistent resources to release.
  }

  /** Returns true when AIRGAP_MODE env var is set to 'true'. */
  isAirgapped(): boolean {
    return process.env.AIRGAP_MODE === 'true';
  }

  /**
   * Verifies that the SHA-256 of the model identifier string matches the
   * pinned hash supplied via AIRGAP_MODEL_HASH.
   *
   * If no pinned hash is configured the check is skipped (warn only).
   * If a hash mismatch is detected, a ForbiddenException is thrown so that
   * the NestJS bootstrap fails fast rather than serving an unverified model.
   */
  verifyModelHash(): void {
    const pinnedHash = process.env.AIRGAP_MODEL_HASH;
    if (!pinnedHash) {
      this.logger.warn(
        'LocalInferenceService: AIRGAP_MODEL_HASH is not set — skipping model hash verification'
      );
      return;
    }

    const modelId = process.env.OLLAMA_MODEL ?? 'llama3';
    const actualHash = createHash('sha256').update(modelId).digest('hex');

    if (actualHash !== pinnedHash) {
      this.logger.error(
        `LocalInferenceService: model hash mismatch — expected=${pinnedHash} actual=${actualHash} model=${modelId}`
      );
      throw new ForbiddenException(
        `Air-gap model hash verification failed for model "${modelId}"`
      );
    }

    this.logger.log(
      `LocalInferenceService: model hash verified for model="${modelId}"`
    );
  }

  /**
   * Throws ForbiddenException when AIRGAP_MODE is active and the requested
   * provider is 'openai' or 'anthropic'.
   */
  enforceAirgapPolicy(provider: string): void {
    if (!this.isAirgapped()) return;

    const blocked = ['openai', 'anthropic'];
    if (blocked.includes(provider.toLowerCase())) {
      this.logger.error(
        `LocalInferenceService: blocked provider="${provider}" in air-gap mode`
      );
      throw new ForbiddenException(
        `Provider "${provider}" is not permitted in air-gap mode. Only Ollama is allowed.`
      );
    }
  }

  /** Creates and returns an Ollama client pointing at the configured base URL. */
  createOllamaClient() {
    const baseURL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
    return createOllama({ baseURL: `${baseURL}/api` });
  }
}
