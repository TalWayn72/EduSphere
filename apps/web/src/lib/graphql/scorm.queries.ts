import { gql } from 'urql';

export const EXPORT_COURSE_AS_SCORM_MUTATION = gql`
  mutation ExportCourseAsScorm($courseId: ID!) {
    exportCourseAsScorm(courseId: $courseId)
  }
`;
