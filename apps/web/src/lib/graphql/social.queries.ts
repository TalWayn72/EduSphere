import { gql } from '@urql/core';

export const SOCIAL_FEED_QUERY = gql`
  query SocialFeed($limit: Int) {
    socialFeed(limit: $limit) {
      id
      actorId
      actorDisplayName
      verb
      objectType
      objectId
      objectTitle
      createdAt
    }
  }
`;

export const SOCIAL_RECOMMENDATIONS_QUERY = gql`
  query SocialRecommendations($limit: Int) {
    socialRecommendations(limit: $limit) {
      contentItemId
      contentTitle
      followersCount
      isMutualFollower
      lastActivity
    }
  }
`;

export const MY_FOLLOWERS_QUERY = gql`
  query MyFollowers($limit: Int) {
    myFollowers(limit: $limit)
  }
`;

export const MY_FOLLOWING_QUERY = gql`
  query MyFollowing($limit: Int) {
    myFollowing(limit: $limit)
  }
`;

export const SEARCH_USERS_QUERY = gql`
  query SearchUsers($query: String!, $limit: Int) {
    searchUsers(query: $query, limit: $limit) {
      userId
      displayName
      bio
      followersCount
      followingCount
      isFollowedByMe
    }
  }
`;
