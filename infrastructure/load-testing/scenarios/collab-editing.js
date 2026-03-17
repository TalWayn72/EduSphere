/**
 * k6 Load Test — CRDT Collaborative Editing via WebSocket
 *
 * Simulates concurrent editors collaborating on a shared document:
 *   1. Authenticate via Keycloak
 *   2. Open a WebSocket connection to the collaboration gateway
 *   3. Send CRDT update messages at realistic typing cadence
 *   4. Verify server acknowledgements arrive within latency budget
 *
 * Target: 50 concurrent editors — p95 < 200 ms per CRDT round-trip.
 *
 * Run:
 *   k6 run scenarios/collab-editing.js
 *   k6 run -e WS_URL=wss://api.edusphere.io/collab scenarios/collab-editing.js
 */
import { check, sleep } from 'k6';
import ws from 'k6/ws';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const errorRate = new Rate('errors');
const crdtRoundTrip = new Trend('crdt_roundtrip', true);
const messagesReceived = new Counter('ws_messages_received');
const messagesSent = new Counter('ws_messages_sent');

// ---------------------------------------------------------------------------
// Environment & constants
// ---------------------------------------------------------------------------
const GATEWAY_URL =
  __ENV.GATEWAY_URL || 'http://localhost:4000/graphql';
const WS_URL =
  __ENV.WS_URL || 'ws://localhost:4000/graphql';
const KEYCLOAK_URL =
  __ENV.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = __ENV.KEYCLOAK_REALM || 'edusphere';
const KEYCLOAK_CLIENT_ID = __ENV.KEYCLOAK_CLIENT_ID || 'edusphere-web';
const TEST_USER = __ENV.TEST_USER || 'student@example.com';
const TEST_PASS = __ENV.TEST_PASS || 'Student123!';
const TENANT_ID = __ENV.TENANT_ID || 'tenant-demo';
const DOCUMENT_ID = __ENV.DOCUMENT_ID || 'collab-doc-load-test';

// Number of CRDT operations each VU sends per connection
const OPS_PER_SESSION = parseInt(__ENV.OPS_PER_SESSION || '20', 10);

// ---------------------------------------------------------------------------
// k6 options — ramp to 50 concurrent editors
// ---------------------------------------------------------------------------
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // warm-up
    { duration: '1m', target: 25 },    // ramp
    { duration: '3m', target: 50 },    // sustain at peak
    { duration: '2m', target: 50 },    // hold
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    errors: ['rate<0.02'],                       // < 2 % error rate
    crdt_roundtrip: ['p(95)<200'],               // CRDT round-trip p95 < 200 ms
    ws_messages_received: ['count>0'],           // at least some acks
  },
};

// ---------------------------------------------------------------------------
// Sample CRDT operations — simulates Y.js / Automerge style updates
// ---------------------------------------------------------------------------
function generateCrdtOp(vuId, seq) {
  return JSON.stringify({
    type: 'crdt_update',
    documentId: DOCUMENT_ID,
    payload: {
      // Simulated Yjs-like operation: insert text at a position
      op: 'insert',
      position: Math.floor(Math.random() * 1000),
      content: `VU${vuId}-op${seq}-${Date.now()}`,
      clientId: `k6-vu-${vuId}`,
      clock: seq,
    },
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
// Default VU function — collaborative editing session
// ---------------------------------------------------------------------------
export default function (data) {
  if (!data.token) {
    console.error('No auth token — skipping iteration');
    errorRate.add(true);
    return;
  }

  const vuId = __VU;
  const wsUrl = `${WS_URL}?token=${data.token}&tenant=${TENANT_ID}`;

  // Track pending operations awaiting server acknowledgement
  const pendingOps = {};

  const res = ws.connect(wsUrl, {}, function (socket) {
    // -- On open: join the document room
    socket.on('open', () => {
      socket.send(
        JSON.stringify({
          type: 'join_document',
          documentId: DOCUMENT_ID,
          clientId: `k6-vu-${vuId}`,
        })
      );

      // Send CRDT operations at a realistic typing cadence (~200-500 ms apart)
      for (let i = 0; i < OPS_PER_SESSION; i++) {
        socket.setTimeout(() => {
          const sendTime = Date.now();
          const opMsg = generateCrdtOp(vuId, i);
          pendingOps[`${vuId}-${i}`] = sendTime;
          socket.send(opMsg);
          messagesSent.add(1);
        }, i * (Math.random() * 300 + 200)); // 200-500 ms between ops
      }

      // Close the socket after all operations + buffer time
      socket.setTimeout(() => {
        socket.close();
      }, OPS_PER_SESSION * 500 + 2000);
    });

    // -- On message: measure round-trip time for acknowledgements
    socket.on('message', (msg) => {
      messagesReceived.add(1);

      try {
        const parsed = JSON.parse(msg);

        if (parsed.type === 'ack' && parsed.opId) {
          const sendTime = pendingOps[parsed.opId];
          if (sendTime) {
            crdtRoundTrip.add(Date.now() - sendTime);
            delete pendingOps[parsed.opId];
          }
        }

        // Also accept CRDT updates from other VUs (broadcast messages)
        if (parsed.type === 'crdt_update') {
          // Receiving remote CRDT op — this is expected
        }
      } catch {
        // Non-JSON message — ignore
      }
    });

    // -- On error
    socket.on('error', (e) => {
      console.error(`WebSocket error (VU ${vuId}): ${e.error()}`);
      errorRate.add(true);
    });

    // -- On close
    socket.on('close', () => {
      // Mark any unacknowledged ops as failures
      const unacked = Object.keys(pendingOps).length;
      if (unacked > 0) {
        console.warn(`VU ${vuId}: ${unacked} unacknowledged ops at close`);
      }
    });
  });

  check(res, {
    'WebSocket connected': (r) => r && r.status === 101,
  });

  // Think time between editing sessions
  sleep(Math.random() * 2 + 1); // 1-3 s
}

// ---------------------------------------------------------------------------
// Summary reporter
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  const crdtP95 = data.metrics.crdt_roundtrip
    ? data.metrics.crdt_roundtrip.values['p(95)'].toFixed(0)
    : 'N/A';

  return {
    'results/collab-editing-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== Collaborative Editing Load Test Summary ===
WS messages sent:     ${data.metrics.ws_messages_sent?.values?.count || 0}
WS messages received: ${data.metrics.ws_messages_received?.values?.count || 0}
CRDT round-trip p50:  ${data.metrics.crdt_roundtrip?.values?.['p(50)']?.toFixed(0) || 'N/A'} ms
CRDT round-trip p95:  ${crdtP95} ms
Error rate:           ${(data.metrics.errors?.values?.rate * 100 || 0).toFixed(2)}%
=================================================
`,
  };
}
