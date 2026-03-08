import { gql } from 'urql';

export const MY_IN_PROGRESS_COURSES_QUERY = gql`
  query MyInProgressCourses($limit: Int = 5) {
    myInProgressCourses(limit: $limit) {
      id
      courseId
      title
      progress
      lastAccessedAt
      instructorName
    }
  }
`;

export const MY_RECOMMENDED_COURSES_QUERY = gql`
  query MyRecommendedCourses($limit: Int = 5) {
    myRecommendedCourses(limit: $limit) {
      courseId
      title
      instructorName
      reason
    }
  }
`;

export const MY_ACTIVITY_FEED_QUERY = gql`
  query MyActivityFeed($limit: Int = 10) {
    myActivityFeed(limit: $limit) {
      id
      eventType
      description
      occurredAt
    }
  }
`;

export const MY_STATS_WITH_STREAK_QUERY = gql`
  query MyStatsWithStreak {
    myStats {
      coursesEnrolled
      conceptsMastered
      totalLearningMinutes
      currentStreak
      longestStreak
    }
  }
`;

export const MY_TOP_MASTERY_TOPICS_QUERY = gql`
  query MyTopMasteryTopics($limit: Int = 5) {
    myTopMasteryTopics(limit: $limit) {
      topicName
      level
    }
  }
`;
