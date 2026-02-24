// tests/performance/scenarios/06-knowledge-graph.k6.js
// Knowledge graph load test: concept search (pgvector+AGE) + learning path traversal
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SMOKE_OPTIONS, LOAD_OPTIONS, SLA_THRESHOLDS } from '../k6.config.js';

const profile = __ENV.K6_PROFILE || 'smoke';

export const options = {
  ...(profile === 'load' ? LOAD_OPTIONS : SMOKE_OPTIONS),
  vus: profile === 'load' ? undefined : 10,
  thresholds: {
    // Graph traversal queries are heavier — wider p95 than standard SLA
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: SLA_THRESHOLDS.http_req_failed,
  },
};

const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://localhost:4000/graphql';
const JWT_TOKEN = __ENV.TEST_JWT || '';

const TOPICS = ['philosophy', 'mathematics', 'computer science', 'biology', 'physics'];

const searchPayload = (topic) =>
  JSON.stringify({
    query: `query SearchConcepts($q: String!, $n: Int) {
      searchConcepts(query: $q, limit: $n) { id name definition }
    }`,
    variables: { q: topic, n: 10 },
  });

const LEARNING_PATH_PAYLOAD = JSON.stringify({
  query: `query LearningPath($from: ID!, $to: ID!) {
    learningPath(fromConceptId: $from, toConceptId: $to) {
      nodes { id name }
      totalSteps
    }
  }`,
  variables: { from: 'concept-intro', to: 'concept-advanced' },
});

const noInternalError = (r) => {
  try {
    return !JSON.parse(r.body).errors?.some((e) => e.extensions?.code === 'INTERNAL_ERROR');
  } catch { return false; }
};

export default function () {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const headers = {
    'Content-Type': 'application/json',
    ...(JWT_TOKEN && { Authorization: `Bearer ${JWT_TOKEN}` }),
  };

  const searchRes = http.post(GATEWAY_URL, searchPayload(topic), { headers });
  check(searchRes, {
    'concept search status 200': (r) => r.status === 200,
    'concept search no server errors': noInternalError,
    'concept search data present': (r) => {
      try { return JSON.parse(r.body).data !== undefined; } catch { return false; }
    },
  });

  sleep(0.5);

  const pathRes = http.post(GATEWAY_URL, LEARNING_PATH_PAYLOAD, { headers });
  check(pathRes, {
    'learning path status 200': (r) => r.status === 200,
    'learning path no server errors': noInternalError,
  });

  sleep(1);
}
