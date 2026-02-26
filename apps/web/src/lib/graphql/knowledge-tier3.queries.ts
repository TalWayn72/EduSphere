import { gql } from 'urql';

// ─── F-006: Skill Gap Analysis ────────────────────────────────────────────────
// skillGapAnalysis, skillProfiles, createSkillProfile not yet in supergraph.
// Excluded from codegen until the supergraph is recomposed with the full
// subgraph-knowledge SDL (which includes skill-gap.resolver.ts).
// Used by: SkillGapWidget.tsx

export const SKILL_GAP_ANALYSIS_QUERY = gql`
  query SkillGapAnalysis($roleId: ID!) {
    skillGapAnalysis(roleId: $roleId) {
      roleId
      roleName
      totalRequired
      mastered
      gapCount
      completionPercentage
      gaps {
        conceptName
        isMastered
        recommendedContentItems
        recommendedContentTitles
        relevanceScore
      }
    }
  }
`;

export const SKILL_PROFILES_QUERY = gql`
  query SkillProfiles {
    skillProfiles {
      id
      roleName
      description
      requiredConceptsCount
    }
  }
`;

export const CREATE_SKILL_PROFILE_MUTATION = gql`
  mutation CreateSkillProfile(
    $roleName: String!
    $description: String
    $requiredConcepts: [String!]!
  ) {
    createSkillProfile(
      roleName: $roleName
      description: $description
      requiredConcepts: $requiredConcepts
    ) {
      id
      roleName
      description
      requiredConceptsCount
    }
  }
`;

// ─── F-036: Social Content Recommendations ────────────────────────────────────
// socialRecommendations, socialFeed not yet in supergraph.
// Used by: SocialFeedWidget.tsx

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

export const SOCIAL_FEED_QUERY = gql`
  query SocialFeed($limit: Int) {
    socialFeed(limit: $limit) {
      userId
      userDisplayName
      action
      contentItemId
      contentTitle
      timestamp
    }
  }
`;
