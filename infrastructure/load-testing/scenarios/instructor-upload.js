/**
 * k6 Load Test — Instructor File Upload Flow
 *
 * Simulates the full upload pipeline:
 *   1. Authenticate as instructor via Keycloak
 *   2. Request a presigned upload URL (GraphQL mutation)
 *   3. PUT a binary payload to MinIO via the presigned URL
 *   4. Confirm the upload via a GraphQL mutation
 *
 * Target: 100 concurrent VUs — p95 < 2 s end-to-end.
 *
 * Run:
 *   k6 run scenarios/instructor-upload.js
 *   k6 run -e GATEWAY_URL=https://api.edusphere.io/graphql scenarios/instructor-upload.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const errorRate = new Rate('errors');
const presignDuration = new Trend('presign_url_duration', true);
const uploadDuration = new Trend('minio_upload_duration', true);
const confirmDuration = new Trend('confirm_upload_duration', true);
const e2eDuration = new Trend('e2e_upload_duration', true);

// ---------------------------------------------------------------------------
// Environment & constants
// ---------------------------------------------------------------------------
const GATEWAY_URL =
  __ENV.GATEWAY_URL || 'http://localhost:4000/graphql';
const KEYCLOAK_URL =
  __ENV.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = __ENV.KEYCLOAK_REALM || 'edusphere';
const KEYCLOAK_CLIENT_ID = __ENV.KEYCLOAK_CLIENT_ID || 'edusphere-web';
const TEST_USER = __ENV.TEST_USER || 'instructor@example.com';
const TEST_PASS = __ENV.TEST_PASS || 'Instructor123!';
const TENANT_ID = __ENV.TENANT_ID || 'tenant-demo';

// Simulated file size (256 KB random payload). Override with FILE_SIZE_KB.
const FILE_SIZE_KB = parseInt(__ENV.FILE_SIZE_KB || '256', 10);

// ---------------------------------------------------------------------------
// k6 options — ramp to 100 VUs
// ---------------------------------------------------------------------------
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // warm-up
    { duration: '1m', target: 50 },    // ramp
    { duration: '3m', target: 100 },   // sustain at peak
    { duration: '2m', target: 100 },   // hold
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],              // < 2 % error rate
    errors: ['rate<0.02'],
    presign_url_duration: ['p(95)<500'],         // presign < 500 ms
    minio_upload_duration: ['p(95)<1500'],       // MinIO PUT < 1.5 s
    confirm_upload_duration: ['p(95)<500'],      // confirm mutation < 500 ms
    e2e_upload_duration: ['p(95)<2000'],         // full flow p95 < 2 s
  },
};

// ---------------------------------------------------------------------------
// GraphQL payloads
// ---------------------------------------------------------------------------
const PRESIGN_MUTATION = JSON.stringify({
  query: `mutation RequestUploadUrl($input: PresignedUploadInput!) {
    requestPresignedUpload(input: $input) {
      uploadUrl
      objectKey
      expiresAt
    }
  }`,
  variables: {
    input: {
      fileName: 'load-test-lecture.pdf',
      contentType: 'application/pdf',
      sizeBytes: FILE_SIZE_KB * 1024,
    },
  },
});

function buildConfirmPayload(objectKey) {
  return JSON.stringify({
    query: `mutation ConfirmUpload($input: ConfirmUploadInput!) {
      confirmUpload(input: $input) {
        id
        fileName
        status
        sizeBytes
        url
      }
    }`,
    variables: {
      input: {
        objectKey,
        fileName: 'load-test-lecture.pdf',
        contentType: 'application/pdf',
        sizeBytes: FILE_SIZE_KB * 1024,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Setup — authenticate as instructor, generate a test payload
// ---------------------------------------------------------------------------
export function setup() {
  const tokenUrl =
    `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

  const res = http.post(tokenUrl, {
    grant_type: 'password',
    client_id: KEYCLOAK_CLIENT_ID,
    username: TEST_USER,
    password: TEST_PASS,
  });

  check(res, {
    'Keycloak token obtained': (r) => r.status === 200,
  });

  if (res.status !== 200) {
    console.error(`Auth failed (${res.status}): ${res.body}`);
    return { token: null, filePayload: null };
  }

  // Build a random binary payload to simulate a real file upload.
  // k6 does not have crypto.getRandomValues — use a repeating pattern.
  const chunk = 'x'.repeat(1024); // 1 KB
  const filePayload = chunk.repeat(FILE_SIZE_KB);

  return {
    token: JSON.parse(res.body).access_token,
    filePayload,
  };
}

// ---------------------------------------------------------------------------
// Default VU function — the upload journey
// ---------------------------------------------------------------------------
export default function (data) {
  if (!data.token) {
    console.error('No auth token — skipping iteration');
    errorRate.add(true);
    return;
  }

  const headers = {
    Authorization: `Bearer ${data.token}`,
    'Content-Type': 'application/json',
    'x-tenant-id': TENANT_ID,
  };

  const iterationStart = Date.now();
  let objectKey = null;

  // Step 1 — Request presigned upload URL
  group('Request presigned URL', () => {
    const res = http.post(GATEWAY_URL, PRESIGN_MUTATION, { headers });
    presignDuration.add(res.timings.duration);

    const ok = check(res, {
      'presign status 200': (r) => r.status === 200,
      'presign returns uploadUrl': (r) => {
        try {
          const body = JSON.parse(r.body);
          objectKey = body.data?.requestPresignedUpload?.objectKey;
          return !!body.data?.requestPresignedUpload?.uploadUrl && !body.errors;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);

    if (!ok) return; // abort this iteration if presign failed

    // Step 2 — PUT file to MinIO via presigned URL
    const uploadUrl = JSON.parse(res.body).data.requestPresignedUpload.uploadUrl;

    const uploadRes = http.put(uploadUrl, data.filePayload, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(data.filePayload.length),
      },
    });
    uploadDuration.add(uploadRes.timings.duration);

    const uploadOk = check(uploadRes, {
      'MinIO upload status 200': (r) => r.status === 200 || r.status === 204,
    });
    errorRate.add(!uploadOk);
  });

  // Step 3 — Confirm upload via GraphQL mutation
  if (objectKey) {
    group('Confirm upload', () => {
      const confirmPayload = buildConfirmPayload(objectKey);
      const res = http.post(GATEWAY_URL, confirmPayload, { headers });
      confirmDuration.add(res.timings.duration);

      const ok = check(res, {
        'confirm status 200': (r) => r.status === 200,
        'confirm returns file id': (r) => {
          try {
            const body = JSON.parse(r.body);
            return !!body.data?.confirmUpload?.id && !body.errors;
          } catch {
            return false;
          }
        },
      });
      errorRate.add(!ok);
    });
  }

  // Track end-to-end duration
  e2eDuration.add(Date.now() - iterationStart);

  // Think time — instructor reviews upload status
  sleep(Math.random() * 3 + 2); // 2-5 s
}

// ---------------------------------------------------------------------------
// Summary reporter
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  return {
    'results/instructor-upload-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== Instructor Upload Load Test Summary ===
Total requests:  ${data.metrics.http_reqs.values.count}
Error rate:      ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
p50 latency:     ${data.metrics.http_req_duration.values['p(50)'].toFixed(0)} ms
p95 latency:     ${data.metrics.http_req_duration.values['p(95)'].toFixed(0)} ms
p99 latency:     ${data.metrics.http_req_duration.values['p(99)'].toFixed(0)} ms
=============================================
`,
  };
}
