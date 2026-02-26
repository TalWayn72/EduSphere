import { gql } from 'urql';

export const COMPLIANCE_COURSES_QUERY = gql`
  query ComplianceCourses {
    complianceCourses {
      id
      title
      slug
      isCompliance
      complianceDueDate
      isPublished
      estimatedHours
    }
  }
`;

export const GENERATE_COMPLIANCE_REPORT_MUTATION = gql`
  mutation GenerateComplianceReport($courseIds: [ID!]!, $asOf: String) {
    generateComplianceReport(courseIds: $courseIds, asOf: $asOf) {
      csvUrl
      pdfUrl
      summary {
        totalUsers
        totalEnrollments
        completedCount
        completionRate
        overdueCount
        generatedAt
      }
    }
  }
`;

export const UPDATE_COURSE_COMPLIANCE_MUTATION = gql`
  mutation UpdateCourseComplianceSettings(
    $courseId: ID!
    $isCompliance: Boolean!
    $complianceDueDate: String
  ) {
    updateCourseComplianceSettings(
      courseId: $courseId
      isCompliance: $isCompliance
      complianceDueDate: $complianceDueDate
    ) {
      id
      title
      isCompliance
      complianceDueDate
    }
  }
`;
