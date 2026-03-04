// tests/performance/scenarios/10-lesson-pipeline-load.k6.js
// Load test for the lesson pipeline API: create pipeline, poll status, fetch results.
// Thresholds are relaxed vs the course-list scenario because pipeline operations
// involve async orchestration (asset ingestion, embedding, chunking).
//
// Usage (smoke — CI):
//   k6 run tests/performance/scenarios/10-lesson-pipeline-load.k6.js
//
// Usage (full nightly load):
//   K6_PROFILE=load k6 run tests/performance/scenarios/10-lesson-pipeline-load.k6.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { SMOKE_OPTIONS, LOAD_OPTIONS } from '../k6.config.js';

// Custom metric: pipeline-specific error rate
const pipelineErrors = new Rate('pipeline_errors');

const PROFILE = __ENV.K6_PROFILE || 'smoke';

export const options =
  PROFILE === 'load'
    ? {
        ...LOAD_OPTIONS,
        thresholds: {
          // Pipeline operations are I/O-bound — allow up to 2s p95
          http_req_duration: ['p(95)<2000', 'p(99)<4000'],
          http_req_failed: ['rate<0.02'],
          pipeline_errors: ['rate<0.02'],
        },
      }
    : {
        ...SMOKE_OPTIONS,
        vus: 10,
        duration: '30s',
        thresholds: {
          http_req_duration: ['p(95)<2000', 'p(99)<4000'],
          http_req_failed: ['rate<0.02'],
          pipeline_errors: ['rate<0.02'],
        },
      };

const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://localhost:4000/graphql';
const JWT_TOKEN = __ENV.TEST_JWT || '';

// Pre-seeded lesson IDs in the test database (set via env or use fallbacks)
const LESSON_IDS = (__ENV.TEST_LESSON_IDS || 'lesson-1,lesson-2,lesson-3').split(',');

const HEADERS = {
  'Content-Type': 'application/json',
  ...(JWT_TOKEN ? { Authorization: `Bearer ${JWT_TOKEN}` } : {}),
};

// ── GraphQL documents ──────────────────────────────────────────────────────────

const SAVE_PIPELINE_MUTATION = (lessonId) =>
  JSON.stringify({
    query: `mutation SavePipeline($lessonId: ID!, $nodes: [PipelineNodeInput!]!) {
      saveLessonPipeline(lessonId: $lessonId, nodes: $nodes) {
        id
        status
      }
    }`,
    variables: {
      lessonId,
      nodes: [
        { type: 'INGESTION', config: '{}' },
        { type: 'CHUNKING', config: '{}' },
        { type: 'EMBEDDING', config: '{}' },
        { type: 'SUMMARIZATION', config: '{}' },
      ],
    },
  });

const RUN_PIPELINE_MUTATION = (pipelineId) =>
  JSON.stringify({
    query: `mutation RunPipeline($pipelineId: ID!) {
      runLessonPipeline(pipelineId: $pipelineId) {
        id
        status
        startedAt
      }
    }`,
    variables: { pipelineId },
  });

const PIPELINE_STATUS_QUERY = (lessonId) =>
  JSON.stringify({
    query: `query LessonPipelineStatus($lessonId: ID!) {
      lesson(id: $lessonId) {
        id
        pipeline {
          id
          status
          currentRun {
            id
            status
            completedAt
          }
        }
      }
    }`,
    variables: { lessonId },
  });

// ── Virtual user scenario ─────────────────────────────────────────────────────

export default function () {
  const lessonId = LESSON_IDS[Math.floor(Math.random() * LESSON_IDS.length)];

  // Step 1: Save pipeline configuration
  const saveRes = http.post(GATEWAY_URL, SAVE_PIPELINE_MUTATION(lessonId), {
    headers: HEADERS,
    tags: { name: 'save_pipeline' },
  });

  const saveOk = check(saveRes, {
    'save pipeline: status 200': (r) => r.status === 200,
    'save pipeline: no network error': (r) => r.status !== 0,
    'save pipeline: has data or auth error': (r) => {
      try {
        const body = JSON.parse(r.body);
        return (
          body.data?.saveLessonPipeline !== undefined ||
          body.errors?.some((e) =>
            ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'].includes(
              e.extensions?.code
            )
          )
        );
      } catch {
        return false;
      }
    },
  });

  if (!saveOk) {
    pipelineErrors.add(1);
    sleep(1);
    return;
  }

  let pipelineId;
  try {
    pipelineId = JSON.parse(saveRes.body)?.data?.saveLessonPipeline?.id;
  } catch {
    pipelineErrors.add(1);
    sleep(1);
    return;
  }

  sleep(0.5);

  // Step 2: Trigger pipeline run (if save returned a pipeline id)
  if (pipelineId) {
    const runRes = http.post(GATEWAY_URL, RUN_PIPELINE_MUTATION(pipelineId), {
      headers: HEADERS,
      tags: { name: 'run_pipeline' },
    });

    check(runRes, {
      'run pipeline: status 200': (r) => r.status === 200,
      'run pipeline: accepted or auth error': (r) => {
        try {
          const body = JSON.parse(r.body);
          return (
            body.data?.runLessonPipeline !== undefined ||
            body.errors?.some((e) =>
              ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'].includes(
                e.extensions?.code
              )
            )
          );
        } catch {
          return false;
        }
      },
    });
  }

  sleep(0.5);

  // Step 3: Poll pipeline status (simulates UI polling)
  const statusRes = http.post(GATEWAY_URL, PIPELINE_STATUS_QUERY(lessonId), {
    headers: HEADERS,
    tags: { name: 'pipeline_status' },
  });

  const statusOk = check(statusRes, {
    'status query: status 200': (r) => r.status === 200,
    'status query: response time < 500ms': (r) => r.timings.duration < 500,
    'status query: lesson field present': (r) => {
      try {
        const body = JSON.parse(r.body);
        return (
          body.data?.lesson !== undefined ||
          body.errors?.some((e) =>
            ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'].includes(
              e.extensions?.code
            )
          )
        );
      } catch {
        return false;
      }
    },
  });

  if (!statusOk) {
    pipelineErrors.add(1);
  }

  sleep(1);
}
