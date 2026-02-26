import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  connect,
  StringCodec,
  type NatsConnection,
  type Subscription,
} from 'nats';
import { createDatabaseConnection, schema, closeAllPools } from '@edusphere/db';
import { eq } from 'drizzle-orm';
import { generateText, type LanguageModel } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client } from '@aws-sdk/client-s3';
import { minioConfig } from '@edusphere/config';

const ALT_TEXT_SUBJECT = 'EDUSPHERE.media.uploaded';
const MAX_ALT_TEXT_LENGTH = 125;
const PRESIGNED_URL_EXPIRY_SECONDS = 300;

interface MediaUploadedPayload {
  assetId: string;
  fileKey: string;
  courseId: string;
  tenantId: string;
  fileName: string;
  contentType: string;
}

@Injectable()
export class AltTextGeneratorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AltTextGeneratorService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private readonly s3: S3Client;
  private readonly bucket: string;
  private nc: NatsConnection | null = null;
  private subscription: Subscription | null = null;

  constructor() {
    const scheme = minioConfig.useSSL ? 'https' : 'http';
    const endpoint = `${scheme}://${minioConfig.endpoint}:${minioConfig.port}`;
    this.bucket = minioConfig.bucket;
    this.s3 = new S3Client({
      endpoint,
      region: minioConfig.region,
      credentials: {
        accessKeyId: minioConfig.accessKey,
        secretAccessKey: minioConfig.secretKey,
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit(): Promise<void> {
    const natsUrl = process.env.NATS_URL ?? 'nats://localhost:4222';
    try {
      this.nc = await connect({ servers: natsUrl });
      this.subscription = this.nc.subscribe(ALT_TEXT_SUBJECT);
      this.logger.log(`Subscribed to ${ALT_TEXT_SUBJECT}`);
      void this.consumeMessages();
    } catch (err) {
      this.logger.error(
        'Failed to connect to NATS for alt-text generation',
        err
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.subscription?.unsubscribe();
    this.subscription = null;
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    await closeAllPools();
  }

  private async consumeMessages(): Promise<void> {
    if (!this.subscription) return;
    for await (const msg of this.subscription) {
      try {
        const raw = this.sc.decode(msg.data);
        const payload = JSON.parse(raw) as MediaUploadedPayload;
        await this.handleMediaUploaded(payload);
      } catch (err) {
        this.logger.error('Error processing media.uploaded message', err);
      }
    }
  }

  private async handleMediaUploaded(
    payload: MediaUploadedPayload
  ): Promise<void> {
    if (!payload.contentType.startsWith('image/')) {
      this.logger.debug(
        `Skipping alt-text for non-image: ${payload.contentType}`
      );
      return;
    }

    this.logger.log(`Generating alt-text for asset=${payload.assetId}`);

    try {
      const presignedUrl = await this.getPresignedUrl(payload.fileKey);
      const altText = await this.generateAltText(presignedUrl, payload.assetId);
      await this.saveAltText(payload.assetId, altText);
      this.logger.log(`Alt-text saved: asset=${payload.assetId}`);
    } catch (err) {
      this.logger.error(
        `Alt-text generation failed for asset=${payload.assetId}`,
        err
      );
    }
  }

  private async getPresignedUrl(fileKey: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: fileKey });
    return getSignedUrl(this.s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
    });
  }

  private async generateAltText(
    presignedUrl: string,
    assetId: string
  ): Promise<string> {
    const isExternal = !process.env.OLLAMA_URL;
    const model = (isExternal
      ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })('gpt-4o')
      : createOllama({ baseURL: `${process.env.OLLAMA_URL}/api` })(
          'llava'
        )) as unknown as LanguageModel;

    this.logger.debug(
      `Using ${isExternal ? 'OpenAI gpt-4o' : 'Ollama llava'} for asset=${assetId}`
    );

    const result = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', image: new URL(presignedUrl) },
            {
              type: 'text',
              text: `Generate a concise, descriptive alt-text for this image (max ${MAX_ALT_TEXT_LENGTH} characters). Describe what is shown without saying "image of" or "picture of".`,
            },
          ],
        },
      ],
    });

    return result.text.trim().slice(0, MAX_ALT_TEXT_LENGTH);
  }

  private async saveAltText(assetId: string, altText: string): Promise<void> {
    await this.db
      .update(schema.media_assets)
      .set({ alt_text: altText })
      .where(eq(schema.media_assets.id, assetId));
  }
}
