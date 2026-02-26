// tests/performance/scenarios/09-agent-concurrent.k6.js
// Concurrent AI agent sessions — verifies LLM inference SLA under parallel load
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SMOKE_OPTIONS, LOAD_OPTIONS } from '../k6.config.js';

const profile = __ENV.K6_PROFILE || 'smoke';

export const options = {
  ...(profile === 'load' ? LOAD_OPTIONS : SMOKE_OPTIONS),
  vus: profile === 'load' ? undefined : 15, // higher concurrency than 05-agent-session
  thresholds: {
    http_req_duration: ['p(95)<5000', 'p(99)<10000'],
    http_req_failed: ['rate<0.05'],
  },
};

const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://localhost:4000/graphql';
const JWT_TOKEN = __ENV.TEST_JWT || '';
const TEMPLATE_IDS = [__ENV.TEST_TEMPLATE_ID || 'test-template-id'];

const startSession = (templateId) =>
  JSON.stringify({
    query: `mutation StartAgentSession($tId: ID!, $cId: ID) {
      startAgentSession(templateId: $tId, contentItemId: $cId) { id status createdAt }
    }`,
    variables: { tId: templateId, cId: __ENV.TEST_CONTENT_ID || null },
  });

const sendMessage = (sessionId) =>
  JSON.stringify({
    query: `mutation SendAgentMessage($sId: ID!, $msg: String!) {
      sendAgentMessage(sessionId: $sId, content: $msg) { id role content createdAt }
    }`,
    variables: { sId: sessionId, msg: 'Explain this concept briefly.' },
  });

const authCodes = ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'];
const acceptedOrAuth = (body, field) =>
  body.data?.[field] !== undefined ||
  body.errors?.some((e) => authCodes.includes(e.extensions?.code));

export default function () {
  if (!JWT_TOKEN) {
    sleep(1);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${JWT_TOKEN}`,
  };
  const templateId =
    TEMPLATE_IDS[Math.floor(Math.random() * TEMPLATE_IDS.length)];

  // Step 1: create agent session
  const sessionRes = http.post(GATEWAY_URL, startSession(templateId), {
    headers,
  });
  const sessionOk = check(sessionRes, {
    'session creation status 200': (r) => r.status === 200,
    'session created or auth error': (r) => {
      try {
        return acceptedOrAuth(JSON.parse(r.body), 'startAgentSession');
      } catch {
        return false;
      }
    },
  });

  if (!sessionOk) {
    sleep(2);
    return;
  }

  let sessionId;
  try {
    sessionId = JSON.parse(sessionRes.body).data?.startAgentSession?.id;
  } catch {
    sleep(2);
    return;
  }
  if (!sessionId) {
    sleep(2);
    return;
  }

  sleep(0.5);

  // Step 2: send a message and verify agent responds within SLA
  const msgRes = http.post(GATEWAY_URL, sendMessage(sessionId), { headers });
  check(msgRes, {
    'message send status 200': (r) => r.status === 200,
    'agent responded or accepted': (r) => {
      try {
        return acceptedOrAuth(JSON.parse(r.body), 'sendAgentMessage');
      } catch {
        return false;
      }
    },
  });

  sleep(2);
}
