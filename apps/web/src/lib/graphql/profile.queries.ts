import { gql } from 'urql';

export const PUBLIC_PROFILE_QUERY = gql`
  query PublicProfile($userId: ID!) {
    publicProfile(userId: $userId) {
      userId
      displayName
      bio
      avatarUrl
      joinedAt
      currentStreak
      longestStreak
      completedCoursesCount
      completedCourses {
        id
        title
        completedAt
      }
      badgesCount
      conceptsMastered
      totalLearningMinutes
    }
  }
`;

export const FOLLOW_USER_MUTATION = gql`
  mutation FollowUser($userId: ID!) {
    followUser(userId: $userId)
  }
`;

export const UNFOLLOW_USER_MUTATION = gql`
  mutation UnfollowUser($userId: ID!) {
    unfollowUser(userId: $userId)
  }
`;

export const MY_FOLLOWERS_QUERY = gql`
  query MyFollowers($userId: ID!, $limit: Int) {
    myFollowers(limit: $limit)
  }
`;

export const MY_FOLLOWING_QUERY = gql`
  query MyFollowing($userId: ID!, $limit: Int) {
    myFollowing(limit: $limit)
  }
`;

export const UPDATE_PROFILE_VISIBILITY_MUTATION = gql`
  mutation UpdateProfileVisibility($isPublic: Boolean!) {
    updateProfileVisibility(isPublic: $isPublic) {
      locale
      theme
      emailNotifications
      pushNotifications
      isPublicProfile
    }
  }
`;
