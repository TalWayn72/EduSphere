/**
 * k6 Load Test — HybridRAG Semantic Search
 *
 * Simulates users performing semantic search queries that hit the Knowledge
 * subgraph's HybridRAG pipeline (pgvector HNSW + Apache AGE graph traversal
 * fused via Reciprocal Rank Fusion before the LLM).
 *
 * Target: 500 concurrent VUs — p95 < 1 s.
 *
 * Run:
 *   k6 run scenarios/hybrid-rag-search.js
 *   k6 run -e GATEWAY_URL=https://api.edusphere.io/graphql scenarios/hybrid-rag-search.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const errorRate = new Rate('errors');
const searchDuration = new Trend('search_query_duration', true);

// ---------------------------------------------------------------------------
// Environment & constants
// ---------------------------------------------------------------------------
const GATEWAY_URL =
  __ENV.GATEWAY_URL || 'http://localhost:4000/graphql';
const KEYCLOAK_URL =
  __ENV.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = __ENV.KEYCLOAK_REALM || 'edusphere';
const KEYCLOAK_CLIENT_ID = __ENV.KEYCLOAK_CLIENT_ID || 'edusphere-web';
const TEST_USER = __ENV.TEST_USER || 'student@example.com';
const TEST_PASS = __ENV.TEST_PASS || 'Student123!';
const TENANT_ID = __ENV.TENANT_ID || 'tenant-demo';

// ---------------------------------------------------------------------------
// k6 options — ramp to 500 VUs
// ---------------------------------------------------------------------------
export const options = {
  stages: [
    { duration: '1m', target: 100 },   // warm-up
    { duration: '2m', target: 300 },   // ramp
    { duration: '3m', target: 500 },   // sustain at peak
    { duration: '2m', target: 500 },   // hold
    { duration: '1m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],          // all HTTP p95 < 1 s
    http_req_failed: ['rate<0.01'],             // < 1 % error rate
    errors: ['rate<0.01'],
    search_query_duration: ['p(95)<1000'],      // RAG search p95 < 1 s
  },
};

// ---------------------------------------------------------------------------
// Sample search queries — realistic academic search terms
// ---------------------------------------------------------------------------
const SEARCH_TERMS = [
  'machine learning gradient descent optimization',
  'Talmudic hermeneutics and modern pedagogy',
  'quantum entanglement introduction for beginners',
  'differential equations applications in physics',
  'object-oriented design patterns SOLID principles',
  'Hebrew linguistics morphology analysis',
  'neural network backpropagation algorithm',
  'data structures binary search tree complexity',
  'educational psychology constructivism theory',
  'cybersecurity threat modeling STRIDE framework',
];

// ---------------------------------------------------------------------------
// GraphQL payload builder
// ---------------------------------------------------------------------------
function buildSearchPayload(query) {
  return JSON.stringify({
    query: `query HybridSearch($query: String!, $limit: Int) {
      knowledgeSearch(query: $query, limit: $limit) {
        results {
          id
          title
          snippet
          score
          source
          conceptNodes {
            id
            label
            type
          }
        }
        totalCount
        searchMode
      }
    }`,
    variables: { query, limit: 10 },
  });
}

// ---------------------------------------------------------------------------
// Setup — authenticate once
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
    return { token: null };
  }

  return { token: JSON.parse(res.body).access_token };
}

// ---------------------------------------------------------------------------
// Default VU function — search journey
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

  // Pick a random search term to avoid caching bias
  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];

  group('HybridRAG semantic search', () => {
    const payload = buildSearchPayload(term);
    const res = http.post(GATEWAY_URL, payload, { headers });
    searchDuration.add(res.timings.duration);

    const ok = check(res, {
      'search status 200': (r) => r.status === 200,
      'search returns results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return (
            body.data &&
            body.data.knowledgeSearch &&
            body.data.knowledgeSearch.results.length >= 0 &&
            !body.errors
          );
        } catch {
          return false;
        }
      },
      'search p95 < 1s': () => res.timings.duration < 1000,
    });
    errorRate.add(!ok);
  });

  // Simulate user reading search results before next query
  sleep(Math.random() * 4 + 2); // 2-6 s think time
}

// ---------------------------------------------------------------------------
// Summary reporter
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  return {
    'results/hybrid-rag-search-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== HybridRAG Search Load Test Summary ===
Total requests:  ${data.metrics.http_reqs.values.count}
Error rate:      ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
p50 latency:     ${data.metrics.http_req_duration.values['p(50)'].toFixed(0)} ms
p95 latency:     ${data.metrics.http_req_duration.values['p(95)'].toFixed(0)} ms
p99 latency:     ${data.metrics.http_req_duration.values['p(99)'].toFixed(0)} ms
============================================
`,
  };
}
