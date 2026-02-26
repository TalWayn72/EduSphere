import {
  Controller,
  Get,
  Param,
  Res,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Response } from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createDatabaseConnection, schema, eq } from '@edusphere/db';
import { ScormSessionService } from './scorm-session.service';

const SCORM_SHIM_SCRIPT = `
<script>
(function() {
  var _sessionId = document.currentScript
    ? document.currentScript.getAttribute('data-session')
    : '';
  var _origin = window.location.origin;
  var _data = {};
  var _timer = null;
  var _initialized = false;

  function postMsg(type, extra) {
    var msg = Object.assign({ type: type, sessionId: _sessionId }, extra);
    window.parent.postMessage(msg, _origin);
  }

  window.API = {
    LMSInitialize: function() { _initialized = true; return 'true'; },
    LMSSetValue: function(el, val) {
      if (!_initialized) return 'false';
      _data[el] = val;
      if (_timer) clearTimeout(_timer);
      _timer = setTimeout(function() {
        postMsg('SCORM_SET', { element: el, value: val });
        _timer = null;
      }, 300);
      return 'true';
    },
    LMSGetValue: function(el) { return _data[el] || ''; },
    LMSCommit: function() {
      if (_timer) { clearTimeout(_timer); _timer = null; }
      postMsg('SCORM_COMMIT', { data: Object.assign({}, _data) });
      return 'true';
    },
    LMSFinish: function() {
      if (_timer) { clearTimeout(_timer); _timer = null; }
      postMsg('SCORM_FINISH', { data: Object.assign({}, _data) });
      return 'true';
    },
    LMSGetLastError: function() { return '0'; },
    LMSGetErrorString: function() { return 'No error'; },
    LMSGetDiagnostic: function() { return ''; }
  };
})();
</script>
`;

@Controller('scorm')
export class ScormController {
  private readonly logger = new Logger(ScormController.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly db = createDatabaseConnection();

  constructor(private readonly sessionService: ScormSessionService) {
    const endpoint = process.env.MINIO_ENDPOINT ?? 'http://localhost:9000';
    this.bucket = process.env.MINIO_BUCKET ?? 'edusphere-media';
    this.s3 = new S3Client({
      endpoint,
      region: process.env.MINIO_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  @Get('launch/:sessionId')
  async launchScorm(
    @Param('sessionId') sessionId: string,
    @Res() res: Response
  ): Promise<void> {
    // Load session to get content item
    const session = await this.sessionService.findSessionById(sessionId);

    // Lookup SCORM package for content item
    const [pkg] = await this.db
      .select()
      .from(schema.scormPackages)
      .where(eq(schema.scormPackages.course_id, session.contentItemId))
      .limit(1);

    if (!pkg) {
      throw new NotFoundException(
        `SCORM package not found for session ${sessionId}`
      );
    }

    // Fetch entry point HTML from MinIO
    const minioKey = `${pkg.minio_prefix}/${pkg.entry_point}`;
    let htmlContent: string;
    try {
      const response = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: minioKey })
      );
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      htmlContent = Buffer.concat(chunks).toString('utf-8');
    } catch (e) {
      this.logger.error(
        `Failed to fetch SCORM entry point: key=${minioKey} err=${String(e)}`
      );
      throw new InternalServerErrorException('Failed to load SCORM content');
    }

    // Inject API shim before </head>
    const shimWithSession = SCORM_SHIM_SCRIPT.replace(
      "data-session''",
      `data-session='${sessionId}'`
    ).replace(
      "getAttribute('data-session')",
      `getAttribute('data-session') || '${sessionId}'`
    );

    const injected = htmlContent.includes('</head>')
      ? htmlContent.replace('</head>', `${shimWithSession}</head>`)
      : shimWithSession + htmlContent;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.send(injected);
  }
}
