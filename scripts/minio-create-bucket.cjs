// One-shot script: create MinIO 'edusphere' bucket and set CORS
// Run inside the container: node /app/scripts/minio-create-bucket.cjs
'use strict';

const http = require('http');
const crypto = require('crypto');

const ENDPOINT = 'localhost';
const PORT = 9000;
const ACCESS_KEY = 'minioadmin';
const SECRET_KEY = 'minioadmin';
const BUCKET = 'edusphere';
const REGION = 'us-east-1';

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sign(key, data) {
  return hmac(key, data);
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = hmac('AWS4' + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  return hmac(kService, 'aws4_request');
}

function makeRequest(method, path, body, contentType) {
  return new Promise((resolve, reject) => {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = crypto
      .createHash('sha256')
      .update(body || '')
      .digest('hex');

    const canonicalHeaders = [
      `content-type:${contentType || 'application/octet-stream'}`,
      `host:${ENDPOINT}:${PORT}`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
    ].join('\n') + '\n';

    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
      method,
      path,
      '', // query
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${REGION}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = getSignatureKey(SECRET_KEY, dateStamp, REGION, 's3');
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex');

    const authHeader =
      `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const bodyBuf = Buffer.from(body || '');
    const options = {
      hostname: ENDPOINT,
      port: PORT,
      path,
      method,
      headers: {
        Authorization: authHeader,
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Length': bodyBuf.length,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (bodyBuf.length > 0) req.write(bodyBuf);
    req.end();
  });
}

async function main() {
  console.log(`Creating bucket '${BUCKET}' in MinIO...`);

  // Check if bucket exists (HEAD request)
  const head = await makeRequest('HEAD', `/${BUCKET}`, '', 'application/octet-stream');
  if (head.status === 200) {
    console.log(`Bucket '${BUCKET}' already exists.`);
  } else if (head.status === 404) {
    // Create bucket
    const create = await makeRequest('PUT', `/${BUCKET}`, '', 'application/octet-stream');
    if (create.status === 200) {
      console.log(`Bucket '${BUCKET}' created successfully.`);
    } else {
      console.error(`Failed to create bucket: HTTP ${create.status}\n${create.body}`);
      process.exit(1);
    }
  } else {
    console.log(`Bucket check returned: HTTP ${head.status}`);
    // Try to create anyway
    const create = await makeRequest('PUT', `/${BUCKET}`, '', 'application/octet-stream');
    console.log(`Create attempt: HTTP ${create.status}\n${create.body}`);
  }

  // Set CORS policy
  const corsXml = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>http://localhost:5173</AllowedOrigin>
    <AllowedOrigin>http://localhost:3000</AllowedOrigin>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>DELETE</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`;

  const cors = await makeRequest('PUT', `/${BUCKET}?cors`, corsXml, 'application/xml');
  if (cors.status === 200) {
    console.log('CORS policy set successfully.');
  } else {
    console.warn(`CORS set returned HTTP ${cors.status}: ${cors.body}`);
  }

  console.log('MinIO initialization complete.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
