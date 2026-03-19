/**
 * Exam session hooks — GraphQL query/mutation wrappers for the exam system.
 * Split: queries in useExamQueries, mutations in useExamMutations, re-exported here.
 */
export {
  useExamBlueprint,
  useExamSession,
  useExamResult,
} from './useExamQueries';

export {
  useStartExamSession,
  useSubmitExamAnswer,
  useFlagExamQuestion,
  useSubmitExam,
} from './useExamMutations';
