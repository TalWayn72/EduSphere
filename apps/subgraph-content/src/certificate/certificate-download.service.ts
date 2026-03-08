import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { minioConfig } from '@edusphere/config';

const PRESIGNED_URL_EXPIRY_SECONDS = 900; // 15 minutes

@Injectable()
export class CertificateDownloadService implements OnModuleDestroy {
  private readonly logger = new Logger(CertificateDownloadService.name);
  private readonly db = createDatabaseConnection();
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = minioConfig.bucket;
    this.s3 = new S3Client({
      endpoint: `http://${minioConfig.endpoint}:${minioConfig.port}`,
      region: minioConfig.region,
      credentials: {
        accessKeyId: minioConfig.accessKey,
        secretAccessKey: minioConfig.secretKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.s3.destroy();
    this.logger.log(
      '[CertificateDownloadService] S3 client destroyed on module destroy'
    );
  }

  async getCertificateDownloadUrl(
    certId: string,
    userId: string,
    tenantId: string
  ): Promise<string> {
    const ctx: TenantContext = {
      tenantId,
      userId,
      userRole: 'STUDENT',
    };

    const [cert] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.certificates)
        .where(
          and(
            eq(schema.certificates.id, certId),
            eq(schema.certificates.user_id, userId)
          )
        )
        .limit(1)
    );

    if (!cert) {
      this.logger.warn(
        `[CertificateDownloadService] Certificate not found: certId=${certId} userId=${userId} tenantId=${tenantId}`
      );
      throw new NotFoundException(
        `Certificate ${certId} not found for this user`
      );
    }

    if (!cert.pdf_url) {
      this.logger.warn(
        `[CertificateDownloadService] PDF not yet generated: certId=${certId} userId=${userId}`
      );
      throw new BadRequestException('PDF not yet generated for this certificate');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: cert.pdf_url,
    });

    const presignedUrl = await getSignedUrl(this.s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
    });

    this.logger.log(
      `[CertificateDownloadService] Presigned URL generated: certId=${certId} userId=${userId} tenantId=${tenantId}`
    );

    return presignedUrl;
  }
}
