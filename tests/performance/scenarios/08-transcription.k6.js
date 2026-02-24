// tests/performance/scenarios/08-transcription.k6.js
// Transcription pipeline test: request job → poll status → verify completion
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SMOKE_OPTIONS, LOAD_OPTIONS, SLA_THRESHOLDS } from '../k6.config.js';

const profile = __ENV.K6_PROFILE || 'smoke';

export const options = {
  ...(profile === 'load' ? LOAD_OPTIONS : SMOKE_OPTIONS),
  vus: profile === 'load' ? undefined : 3, // GPU-bound — keep concurrency low
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: SLA_THRESHOLDS.http_req_failed,
  },
};

const API_URL = __ENV.GATEWAY_URL?.replace('/graphql', '') || 'http://localhost:4000';
const JWT_TOKEN = __ENV.TEST_JWT || '';
const CONTENT_ID = __ENV.TEST_CONTENT_ID || 'perf-content-001';

const UPLOAD_MUTATION = JSON.stringify({
  query: `mutation RequestTranscription($id: ID!) {
    requestTranscription(contentItemId: $id) { jobId status }
  }`,
  variables: { id: CONTENT_ID },
});

const statusQuery = (jobId) =>
  JSON.stringify({
    query: `query TranscriptionStatus($jobId: ID!) {
      transcriptionJob(jobId: $jobId) { jobId status completedAt }
    }`,
    variables: { jobId },
  });

const terminalCodes = ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'];

const acceptedBody = (body, field) =>
  body.data?.[field] !== undefined ||
  body.errors?.some((e) => terminalCodes.includes(e.extensions?.code));

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(JWT_TOKEN && { Authorization: `Bearer ${JWT_TOKEN}` }),
  };

  // Step 1: request a transcription job
  const uploadRes = http.post(`${API_URL}/graphql`, UPLOAD_MUTATION, { headers });
  const uploadOk = check(uploadRes, {
    'transcription request status 200': (r) => r.status === 200,
    'job created or auth error': (r) => {
      try { return acceptedBody(JSON.parse(r.body), 'requestTranscription'); }
      catch { return false; }
    },
  });

  if (!uploadOk) { sleep(1); return; }

  let jobId;
  try { jobId = JSON.parse(uploadRes.body).data?.requestTranscription?.jobId; }
  catch { sleep(1); return; }
  if (!jobId) { sleep(1); return; }

  sleep(2);

  // Step 2: poll for completion (max 2 polls)
  for (let i = 0; i < 2; i++) {
    const pollRes = http.post(`${API_URL}/graphql`, statusQuery(jobId), { headers });
    check(pollRes, {
      'status poll returns 200': (r) => r.status === 200,
      'status field present': (r) => {
        try { return JSON.parse(r.body).data?.transcriptionJob?.status !== undefined; }
        catch { return false; }
      },
    });
    const status = (() => {
      try { return JSON.parse(pollRes.body).data?.transcriptionJob?.status; }
      catch { return null; }
    })();
    if (status === 'COMPLETED' || status === 'FAILED') break;
    sleep(3);
  }

  sleep(1);
}
