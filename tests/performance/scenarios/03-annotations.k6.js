import http from 'k6/http';
import { check, sleep } from 'k6';
import { SMOKE_OPTIONS } from '../k6.config.js';

export const options = {
  ...SMOKE_OPTIONS,
  vus: 10,
};

const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://localhost:4000/graphql';
const JWT_TOKEN = __ENV.TEST_JWT || '';

const ANNOTATIONS_QUERY = JSON.stringify({
  query: `query Annotations($assetId: ID!) {
    annotations(assetId: $assetId, limit: 20, offset: 0) {
      id
      layer
      isResolved
      createdAt
    }
  }`,
  variables: { assetId: __ENV.TEST_ASSET_ID || 'test-asset-id' },
});

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(JWT_TOKEN && { Authorization: `Bearer ${JWT_TOKEN}` }),
  };

  const res = http.post(GATEWAY_URL, ANNOTATIONS_QUERY, { headers });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'no auth errors': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !body.errors?.some(
          (e) => e.extensions?.code === 'UNAUTHENTICATED'
        );
      } catch {
        return false;
      }
    },
    'annotations field present': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch {
        return false;
      }
    },
  });

  sleep(0.5);
}
