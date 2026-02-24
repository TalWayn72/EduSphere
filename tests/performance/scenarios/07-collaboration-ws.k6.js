// tests/performance/scenarios/07-collaboration-ws.k6.js
// WebSocket collaboration load test targeting Hocuspocus endpoint
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { SMOKE_OPTIONS, LOAD_OPTIONS } from '../k6.config.js';

const profile = __ENV.K6_PROFILE || 'smoke';

export const options = {
  ...(profile === 'load' ? LOAD_OPTIONS : SMOKE_OPTIONS),
  // WS concurrency kept lower than HTTP — each conn holds a socket
  vus: profile === 'load' ? undefined : 10,
  thresholds: {
    // Hocuspocus sync should complete within 1s under normal load
    ws_session_duration: ['p(95)<1000'],
    ws_connecting: ['p(95)<300'],
    checks: ['rate>0.95'],
  },
};

const WS_URL =
  __ENV.COLLAB_WS_URL ||
  (__ENV.GATEWAY_URL || 'http://localhost:4004')
    .replace(/^http/, 'ws')
    .replace('/graphql', '') + '/collaboration';

const JWT_TOKEN = __ENV.TEST_JWT || '';

// Minimal Hocuspocus protocol message: sync step 1
const SYNC_STEP1 = new Uint8Array([0, 0, 1]).buffer;

// Minimal document update payload (Yjs awareness update — 8 bytes)
const DOC_UPDATE = new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0]).buffer;

export default function () {
  const docId = `perf-doc-${__VU}`;
  const url = `${WS_URL}/${docId}`;
  const params = JWT_TOKEN
    ? { headers: { Authorization: `Bearer ${JWT_TOKEN}` } }
    : {};

  const res = ws.connect(url, params, (socket) => {
    let syncReceived = false;

    socket.on('open', () => {
      // Send Hocuspocus sync step 1 to initiate handshake
      socket.sendBinary(SYNC_STEP1);
    });

    socket.on('binaryMessage', () => {
      if (!syncReceived) {
        syncReceived = true;
        // Send a document update after initial sync
        socket.sendBinary(DOC_UPDATE);
      }
      // Close cleanly after first round-trip
      socket.close();
    });

    socket.on('error', (e) => {
      // Non-fatal: service may not be running in CI
      socket.close();
    });

    // Safety timeout — close after 3s regardless
    socket.setTimeout(() => socket.close(), 3000);
  });

  check(res, {
    'WebSocket connected successfully': (r) => r && r.status === 101,
  });

  sleep(1);
}
