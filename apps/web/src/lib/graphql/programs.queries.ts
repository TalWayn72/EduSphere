import { gql } from 'urql';

// ─── F-026 Stackable Credentials / Nanodegrees ───────────────────────────────

export const PROGRAMS_QUERY = gql`
  query Programs {
    programs {
      id
      title
      description
      badgeEmoji
      requiredCourseIds
      totalHours
      published
      enrollmentCount
    }
  }
`;

export const PROGRAM_QUERY = gql`
  query Program($id: ID!) {
    program(id: $id) {
      id
      title
      description
      badgeEmoji
      requiredCourseIds
      totalHours
      published
      enrollmentCount
    }
  }
`;

export const MY_PROGRAM_ENROLLMENTS_QUERY = gql`
  query MyProgramEnrollments {
    myProgramEnrollments {
      id
      programId
      userId
      enrolledAt
      completedAt
      certificateId
    }
  }
`;

export const PROGRAM_PROGRESS_QUERY = gql`
  query ProgramProgress($programId: ID!) {
    programProgress(programId: $programId) {
      totalCourses
      completedCourses
      completedCourseIds
      percentComplete
    }
  }
`;

export const ENROLL_IN_PROGRAM_MUTATION = gql`
  mutation EnrollInProgram($programId: ID!) {
    enrollInProgram(programId: $programId) {
      id
      programId
      userId
      enrolledAt
      completedAt
      certificateId
    }
  }
`;

export const CREATE_PROGRAM_MUTATION = gql`
  mutation CreateProgram(
    $title: String!
    $description: String!
    $requiredCourseIds: [ID!]!
    $badgeEmoji: String
    $totalHours: Int
  ) {
    createProgram(
      title: $title
      description: $description
      requiredCourseIds: $requiredCourseIds
      badgeEmoji: $badgeEmoji
      totalHours: $totalHours
    ) {
      id
      title
      description
      badgeEmoji
      requiredCourseIds
      totalHours
      published
      enrollmentCount
    }
  }
`;

export const UPDATE_PROGRAM_MUTATION = gql`
  mutation UpdateProgram(
    $id: ID!
    $title: String
    $description: String
    $published: Boolean
  ) {
    updateProgram(id: $id, title: $title, description: $description, published: $published) {
      id
      title
      description
      badgeEmoji
      requiredCourseIds
      totalHours
      published
      enrollmentCount
    }
  }
`;
