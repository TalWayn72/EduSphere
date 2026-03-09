/**
 * SCORM 2004 (4th Edition) CMI data model constants and utilities.
 * Reference: ADL SCORM 2004 4th Edition Run-Time Environment
 */

export const SCORM2004_ERROR_CODES = {
  NO_ERROR: '0',
  GENERAL_EXCEPTION: '101',
  DATA_MODEL_ELEMENT_NOT_IMPLEMENTED: '401',
  DATA_MODEL_ELEMENT_NOT_SUPPORTED: '402',
  DATA_MODEL_ELEMENT_VALUE_NOT_INITIALIZED: '403',
  DATA_MODEL_INVALID_VALUE: '406',
  DATA_MODEL_DEPENDENCY_NOT_ESTABLISHED: '407',
} as const;

export type Scorm2004ErrorCode =
  (typeof SCORM2004_ERROR_CODES)[keyof typeof SCORM2004_ERROR_CODES];

export interface ScormCmiModel {
  'cmi.completion_status': 'completed' | 'incomplete' | 'not attempted' | 'unknown';
  'cmi.success_status': 'passed' | 'failed' | 'unknown';
  'cmi.score.scaled': number | null;   // -1.0 to 1.0
  'cmi.score.raw': number | null;
  'cmi.score.min': number | null;
  'cmi.score.max': number | null;
  'cmi.progress_measure': number | null; // 0.0 to 1.0
  'cmi.session_time': string;            // ISO 8601 duration e.g. PT1H30M
  'cmi.total_time': string;
  'cmi.suspend_data': string;            // Unlimited — no SCORM 1.2 suspend_data cap
  'cmi.location': string;               // Bookmark
  'cmi.learner_id': string;
  'cmi.learner_name': string;
  'cmi.entry': 'ab-initio' | 'resume' | '';
  'cmi.exit': 'time-out' | 'suspend' | 'logout' | 'normal' | '';
  'cmi.mode': 'browse' | 'normal' | 'review';
}

export function createDefaultCmiModel(
  learnerId: string,
  learnerName: string,
): ScormCmiModel {
  return {
    'cmi.completion_status': 'not attempted',
    'cmi.success_status': 'unknown',
    'cmi.score.scaled': null,
    'cmi.score.raw': null,
    'cmi.score.min': 0,
    'cmi.score.max': 100,
    'cmi.progress_measure': null,
    'cmi.session_time': 'PT0S',
    'cmi.total_time': 'PT0S',
    'cmi.suspend_data': '',
    'cmi.location': '',
    'cmi.learner_id': learnerId,
    'cmi.learner_name': learnerName,
    'cmi.entry': 'ab-initio',
    'cmi.exit': '',
    'cmi.mode': 'normal',
  };
}

/**
 * Parse ISO 8601 duration to seconds.
 * Examples: "PT1H30M" → 5400, "PT90S" → 90, "P1DT2H" → 93600
 */
export function parseDuration(iso: string): number {
  const match = iso.match(
    /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/,
  );
  if (!match) return 0;
  const [, , , d, h, m, s] = match;
  return (
    Number(d ?? 0) * 86400 +
    Number(h ?? 0) * 3600 +
    Number(m ?? 0) * 60 +
    Number(s ?? 0)
  );
}

/**
 * Format seconds to ISO 8601 duration.
 * Examples: 5400 → "PT1H30M", 0 → "PT0S"
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const parts = [
    h ? `${h}H` : '',
    m ? `${m}M` : '',
    s ? `${s}S` : '',
  ].join('');
  return parts ? `PT${parts}` : 'PT0S';
}

/** Add two ISO 8601 durations together */
export function addDurations(a: string, b: string): string {
  return formatDuration(parseDuration(a) + parseDuration(b));
}
