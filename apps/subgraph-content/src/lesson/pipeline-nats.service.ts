import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions, NatsSubjects } from '@edusphere/nats-client';
import type {
  LessonPipelineModuleCompletedPayload,
  NEREntityItem,
} from '@edusphere/nats-client';

@Injectable()
export class PipelineNatsService implements OnModuleDestroy {
  private readonly logger = new Logger(PipelineNatsService.name);
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;

  async onModuleDestroy(): Promise<void> {
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
  }

  async getNats(): Promise<NatsConnection> {
    if (!this.nc) this.nc = await connect(buildNatsOptions());
    return this.nc;
  }

  publishModuleEvent(payload: LessonPipelineModuleCompletedPayload): void {
    this.getNats()
      .then((nc) =>
        nc.publish(
          NatsSubjects.LESSON_PIPELINE_MODULE_COMPLETED,
          this.sc.encode(JSON.stringify(payload))
        )
      )
      .catch(() => undefined);
  }

  publishNEREntities(
    tenantId: string,
    lessonId: string,
    runId: string,
    entities: NEREntityItem[]
  ): void {
    if (!entities.length) return;
    const subject = `EDUSPHERE.content.${tenantId}.ner.extracted`;
    const payload = {
      type: 'lesson.ner.extracted' as const,
      tenantId,
      lessonId,
      runId,
      entities,
      timestamp: new Date().toISOString(),
    };
    this.getNats()
      .then((nc) =>
        nc.publish(subject, this.sc.encode(JSON.stringify(payload)))
      )
      .catch((err) =>
        this.logger.error(
          { err, tenantId, lessonId, runId },
          'Failed to publish NER entities to NATS'
        )
      );
  }

  publishPipelineCompleted(lessonId: string, tenantId: string): void {
    this.getNats()
      .then((nc) =>
        nc.publish(
          NatsSubjects.LESSON_PIPELINE_COMPLETED,
          this.sc.encode(
            JSON.stringify({
              type: 'lesson.pipeline.completed',
              lessonId,
              courseId: '',
              tenantId,
              timestamp: new Date().toISOString(),
            })
          )
        )
      )
      .catch(() => undefined);
  }
}
