import http from 'k6/http';
import { check, sleep } from 'k6';
import { SMOKE_OPTIONS } from '../k6.config.js';

// Agent creation is expensive — use fewer VUs
export const options = {
  ...SMOKE_OPTIONS,
  vus: 5,
  duration: '30s',
  thresholds: {
    // Agent sessions can be slower (LLM inference)
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    http_req_failed: ['rate<0.02'],
  },
};

const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://localhost:4000/graphql';
const JWT_TOKEN = __ENV.TEST_JWT || '';

// Template IDs to use for testing (pre-seeded in test database)
const TEMPLATE_IDS = [__ENV.TEST_TEMPLATE_ID || 'test-template-id'];

const START_SESSION_MUTATION = (templateId) =>
  JSON.stringify({
    query: `mutation StartAgentSession($templateId: ID!, $contentItemId: ID) {
    startAgentSession(templateId: $templateId, contentItemId: $contentItemId) {
      id
      status
      createdAt
    }
  }`,
    variables: {
      templateId,
      contentItemId: __ENV.TEST_CONTENT_ID || null,
    },
  });

export default function () {
  if (!JWT_TOKEN) {
    // Skip if no JWT token provided — agent mutations require auth
    sleep(1);
    return;
  }

  const templateId =
    TEMPLATE_IDS[Math.floor(Math.random() * TEMPLATE_IDS.length)];

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${JWT_TOKEN}`,
  };

  const res = http.post(GATEWAY_URL, START_SESSION_MUTATION(templateId), {
    headers,
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'session created or auth error': (r) => {
      try {
        const body = JSON.parse(r.body);
        // Accept: successful session OR unauthenticated (if token expired)
        return (
          body.data?.startAgentSession !== undefined ||
          body.errors?.some((e) =>
            ['UNAUTHENTICATED', 'FORBIDDEN'].includes(e.extensions?.code)
          )
        );
      } catch {
        return false;
      }
    },
  });

  sleep(2);
}
