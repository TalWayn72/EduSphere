/**
 * Registry of i18n message key arrays for each operation type.
 * Keys reference translations in the 'common' namespace under 'progress.*'.
 */

export const AI_COURSE_GENERATION_MESSAGES = [
  'progress.aiGen.analyzing',
  'progress.aiGen.buildingOutline',
  'progress.aiGen.creatingModules',
  'progress.aiGen.almostReady',
] as const;

export const FILE_UPLOAD_MESSAGES = [
  'progress.upload.preparing',
  'progress.upload.uploading',
  'progress.upload.confirming',
  'progress.upload.done',
] as const;

export const QUIZ_GRADING_MESSAGES = [
  'progress.quiz.checkingAnswers',
  'progress.quiz.calculatingScore',
  'progress.quiz.preparingFeedback',
] as const;

export const CONTENT_IMPORT_MESSAGES = [
  'progress.import.connecting',
  'progress.import.importing',
  'progress.import.processingLessons',
  'progress.import.almostDone',
] as const;

export const AI_CHAT_MESSAGES = [
  'progress.chat.thinking',
  'progress.chat.composing',
  'progress.chat.almostReady',
] as const;

export const PAGE_LOADING_MESSAGES = [
  'progress.page.loadingData',
  'progress.page.processing',
  'progress.page.almostReady',
] as const;

export const ASSIGNMENT_SUBMIT_MESSAGES = [
  'progress.assignment.submitting',
  'progress.assignment.validating',
  'progress.assignment.saving',
] as const;

/** Maps useFileUpload phase string to the corresponding message index */
export const UPLOAD_PHASE_INDEX: Record<string, number> = {
  presigning: 0,
  uploading: 1,
  confirming: 2,
  done: 3,
};
