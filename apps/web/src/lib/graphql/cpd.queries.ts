import { gql } from 'urql';

export const MY_CPD_REPORT_QUERY = gql`
  query MyCpdReport($startDate: String, $endDate: String) {
    myCpdReport(startDate: $startDate, endDate: $endDate) {
      totalHours
      byType {
        name
        regulatoryBody
        totalHours
      }
      entries {
        id
        courseId
        creditTypeName
        earnedHours
        completionDate
      }
    }
  }
`;

export const CPD_CREDIT_TYPES_QUERY = gql`
  query CpdCreditTypes {
    cpdCreditTypes {
      id
      name
      regulatoryBody
      creditHoursPerHour
      isActive
    }
  }
`;

export const EXPORT_CPD_REPORT_MUTATION = gql`
  mutation ExportCpdReport($format: CpdExportFormat!) {
    exportCpdReport(format: $format)
  }
`;

export const CREATE_CPD_CREDIT_TYPE_MUTATION = gql`
  mutation CreateCpdCreditType($name: String!, $regulatoryBody: String!, $creditHoursPerHour: Float!) {
    createCpdCreditType(name: $name, regulatoryBody: $regulatoryBody, creditHoursPerHour: $creditHoursPerHour) {
      id
      name
      regulatoryBody
      creditHoursPerHour
      isActive
    }
  }
`;

export const ASSIGN_CPD_CREDITS_MUTATION = gql`
  mutation AssignCpdCreditsToCourse($courseId: ID!, $creditTypeId: ID!, $creditHours: Float!) {
    assignCpdCreditsToCourse(courseId: $courseId, creditTypeId: $creditTypeId, creditHours: $creditHours)
  }
`;
