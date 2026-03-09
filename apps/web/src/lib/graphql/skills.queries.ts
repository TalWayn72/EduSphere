import { gql } from 'urql';

export const SKILLS_QUERY = gql`
  query Skills($category: String, $limit: Int, $offset: Int) {
    skills(category: $category, limit: $limit, offset: $offset) {
      id
      slug
      name
      description
      category
      level
      parentSkillId
      prerequisites {
        id
        name
        category
      }
    }
  }
`;

export const SKILL_PATHS_QUERY = gql`
  query SkillPaths($limit: Int, $offset: Int) {
    skillPaths(limit: $limit, offset: $offset) {
      id
      title
      description
      targetRole
      skillIds
      estimatedHours
      isPublished
    }
  }
`;

export const MY_SKILL_PROGRESS_QUERY = gql`
  query MySkillProgress {
    mySkillProgress {
      skillId
      masteryLevel
      evidenceCount
      lastActivityAt
    }
  }
`;

export const SKILL_GAP_ANALYSIS_QUERY = gql`
  query SkillGapAnalysis($pathId: ID!) {
    skillGapAnalysis(pathId: $pathId) {
      targetPathId
      totalSkills
      masteredSkills
      completionPct
      gapSkills {
        id
        name
        category
        level
      }
    }
  }
`;

export const UPDATE_SKILL_PROGRESS_MUTATION = gql`
  mutation UpdateMySkillProgress($skillId: ID!, $masteryLevel: MasteryLevel!) {
    updateMySkillProgress(skillId: $skillId, masteryLevel: $masteryLevel) {
      skillId
      masteryLevel
      evidenceCount
    }
  }
`;
