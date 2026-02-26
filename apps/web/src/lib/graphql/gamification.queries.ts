import { gql } from 'urql';

const BADGE_FRAGMENT = gql`
  fragment BadgeFields on Badge {
    id
    name
    description
    iconEmoji
    category
    pointsReward
  }
`;

export const MY_BADGES_QUERY = gql`
  ${BADGE_FRAGMENT}
  query MyBadges {
    myBadges {
      id
      earnedAt
      badge {
        ...BadgeFields
      }
    }
  }
`;

export const LEADERBOARD_QUERY = gql`
  query Leaderboard($limit: Int) {
    leaderboard(limit: $limit) {
      rank
      userId
      displayName
      totalPoints
      badgeCount
    }
  }
`;

export const MY_RANK_QUERY = gql`
  query MyRank {
    myRank
  }
`;

export const MY_TOTAL_POINTS_QUERY = gql`
  query MyTotalPoints {
    myTotalPoints
  }
`;
