export const FIND_CHAVRUTA_PARTNERS_QUERY = `
  query FindChavrutaPartners($input: FindChavrutaPartnerInput!) {
    chavrutaPartnerMatches(input: $input) {
      partnerId
      partnerName
      courseId
      topic
      matchReason
      compatibilityScore
    }
  }
`;

export const CREATE_CHAVRUTA_SESSION_MUTATION = `
  mutation CreateChavrutaPartnerSession($input: CreateChavrutaPartnerSessionInput!) {
    createChavrutaPartnerSession(input: $input) {
      id
      status
      topic
    }
  }
`;
