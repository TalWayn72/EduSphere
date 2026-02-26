/**
 * PlagiarismModule — wires up F-005 plagiarism detection services
 */
import { Module } from '@nestjs/common';
import { PlagiarismResolver } from './plagiarism.resolver.js';
import { PlagiarismService } from './plagiarism.service.js';
import { SubmissionService } from './submission.service.js';
import { EmbeddingClient } from './embedding.client.js';

@Module({
  providers: [
    PlagiarismResolver,
    PlagiarismService,
    SubmissionService,
    EmbeddingClient,
  ],
  exports: [PlagiarismService, SubmissionService],
})
export class PlagiarismModule {}
