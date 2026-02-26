import http from 'k6/http';
import { check, sleep } from 'k6';
import { SMOKE_OPTIONS } from '../k6.config.js';

export const options = {
  ...SMOKE_OPTIONS,
  vus: 10,
};

const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://localhost:4000/graphql';
const JWT_TOKEN = __ENV.TEST_JWT || '';

// Search queries to rotate through for realistic load distribution
const SEARCH_QUERIES = [
  'machine learning fundamentals',
  'neural network architecture',
  'natural language processing',
  'computer vision techniques',
  'reinforcement learning',
];

export default function () {
  const query =
    SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];

  const SEARCH_QUERY = JSON.stringify({
    query: `query SemanticSearch($query: String!, $limit: Int) {
      searchSemantic(query: $query, limit: $limit) {
        id
        contentItemId
        score
        snippet
      }
    }`,
    variables: { query, limit: 10 },
  });

  const headers = {
    'Content-Type': 'application/json',
    ...(JWT_TOKEN && { Authorization: `Bearer ${JWT_TOKEN}` }),
  };

  const res = http.post(GATEWAY_URL, SEARCH_QUERY, { headers });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'no server errors': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !body.errors?.some(
          (e) => e.extensions?.code === 'INTERNAL_ERROR'
        );
      } catch {
        return false;
      }
    },
    'search results returned': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
