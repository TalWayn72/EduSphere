import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import {
  connect,
  StringCodec,
  type NatsConnection,
  type Subscription,
} from 'nats';
import { CertificatePdfService } from './certificate-pdf.service.js';

interface CourseCompletedEvent {
  userId: string;
  courseId: string;
  tenantId: string;
  learnerName: string;
  courseName: string;
}

export interface CertificateResult {
  id: string;
  courseId: string;
  courseName: string;
  issuedAt: string;
  verificationCode: string;
  pdfUrl: string | null;
}

@Injectable()
export class CertificateService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CertificateService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;
  private sub: Subscription | null = null;

  constructor(private readonly pdfService: CertificatePdfService) {}

  async onModuleInit(): Promise<void> {
    await this.subscribeToCompletionEvents();
  }

  async onModuleDestroy(): Promise<void> {
    this.sub?.unsubscribe();
    if (this.nc) await this.nc.close().catch(() => undefined);
    await closeAllPools();
    this.logger.log('CertificateService destroyed — connections closed');
  }

  private async subscribeToCompletionEvents(): Promise<void> {
    const natsUrl = process.env.NATS_URL ?? 'nats://localhost:4222';
    try {
      this.nc = await connect({ servers: natsUrl });
      this.sub = this.nc.subscribe('EDUSPHERE.course.completed');
      this.logger.log('Subscribed to EDUSPHERE.course.completed');
      void this.processMessages();
    } catch (err) {
      this.logger.warn(
        `NATS connection failed — certificates will not auto-generate: ${err}`
      );
    }
  }

  private async processMessages(): Promise<void> {
    if (!this.sub) return;
    for await (const msg of this.sub) {
      try {
        const event = JSON.parse(
          this.sc.decode(msg.data)
        ) as CourseCompletedEvent;
        await this.generateCertificate(event);
      } catch (err) {
        this.logger.error(`Failed to process course.completed event: ${err}`);
      }
    }
  }

  async generateCertificate(
    event: CourseCompletedEvent
  ): Promise<CertificateResult> {
    const ctx: TenantContext = {
      tenantId: event.tenantId,
      userId: event.userId,
      userRole: 'STUDENT',
    };

    // Step 1: Insert stub row to get the DB-generated verification_code
    const [cert] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .insert(schema.certificates)
        .values({
          tenant_id: event.tenantId,
          user_id: event.userId,
          course_id: event.courseId,
          metadata: {
            learnerName: event.learnerName,
            courseName: event.courseName,
          },
        })
        .returning()
    );

    if (!cert) throw new Error('Certificate insert returned no record');

    // Step 2: Generate PDF with correct verification code, then update record
    const pdfKey = await this.pdfService.generateAndUpload({
      tenantId: event.tenantId,
      userId: event.userId,
      courseId: event.courseId,
      learnerName: event.learnerName,
      courseName: event.courseName,
      issuedAt: cert.issued_at,
      verificationCode: cert.verification_code,
    });

    await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .update(schema.certificates)
        .set({ pdf_url: pdfKey })
        .where(eq(schema.certificates.id, cert.id))
    );

    this.logger.log(
      `Certificate issued: id=${cert.id} user=${event.userId} course=${event.courseId}`
    );
    return this.mapCert({ ...cert, pdf_url: pdfKey }, event.courseName);
  }

  async getMyCertificates(ctx: TenantContext): Promise<CertificateResult[]> {
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.certificates)
        .where(eq(schema.certificates.user_id, ctx.userId))
    );

    return rows.map((row) => {
      const meta = row.metadata as Record<string, string> | null;
      return this.mapCert(row, meta?.courseName ?? '');
    });
  }

  async verifyCertificate(code: string): Promise<CertificateResult | null> {
    const [row] = await this.db
      .select()
      .from(schema.certificates)
      .where(eq(schema.certificates.verification_code, code))
      .limit(1);

    if (!row) return null;
    const meta = row.metadata as Record<string, string> | null;
    return this.mapCert(row, meta?.courseName ?? '');
  }

  private mapCert(
    row: typeof schema.certificates.$inferSelect,
    courseName: string
  ): CertificateResult {
    return {
      id: row.id,
      courseId: row.course_id,
      courseName,
      issuedAt: row.issued_at.toISOString(),
      verificationCode: row.verification_code,
      pdfUrl: row.pdf_url ?? null,
    };
  }
}
