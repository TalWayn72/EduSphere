/**
 * Assessment GraphQL queries/mutations — F-030: 360° Multi-Rater Assessments
 */
export const MY_CAMPAIGNS_QUERY = `
  query MyCampaigns { myCampaigns {
    id title targetUserId status dueDate criteriaCount
  }}
`;

export const CREATE_CAMPAIGN_MUTATION = `
  mutation CreateAssessmentCampaign($title: String!, $targetUserId: ID!, $dueDate: String) {
    createAssessmentCampaign(title: $title, targetUserId: $targetUserId, dueDate: $dueDate) {
      id title status
    }
  }
`;

export const ACTIVATE_CAMPAIGN_MUTATION = `
  mutation ActivateCampaign($campaignId: ID!) {
    activateAssessmentCampaign(campaignId: $campaignId)
  }
`;

export const COMPLETE_CAMPAIGN_MUTATION = `
  mutation CompleteCampaign($campaignId: ID!) {
    completeAssessmentCampaign(campaignId: $campaignId) { campaignId summary }
  }
`;

export const ASSESSMENT_RESULT_QUERY = `
  query AssessmentResult($campaignId: ID!) {
    assessmentResult(campaignId: $campaignId) {
      campaignId summary generatedAt
      aggregatedScores {
        criteriaId label selfScore peerAvg managerScore overallAvg
      }
    }
  }
`;

export const SUBMIT_RESPONSE_MUTATION = `
  mutation SubmitAssessmentResponse(
    $campaignId: ID!
    $raterRole: RaterRole!
    $criteriaScores: String!
    $narrative: String
  ) {
    submitAssessmentResponse(
      campaignId: $campaignId
      raterRole: $raterRole
      criteriaScores: $criteriaScores
      narrative: $narrative
    )
  }
`;
