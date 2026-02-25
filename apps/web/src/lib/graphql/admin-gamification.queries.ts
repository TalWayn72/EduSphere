export const ADMIN_BADGES_QUERY = `
  query AdminBadges {
    adminBadges {
      id
      name
      description
      iconEmoji
      category
      pointsReward
      conditionType
      conditionValue
    }
  }
`;

export const CREATE_BADGE_MUTATION = `
  mutation CreateBadge($input: CreateBadgeInput!) {
    createBadge(input: $input) {
      id
      name
      description
      iconEmoji
      category
      pointsReward
      conditionType
      conditionValue
    }
  }
`;

export const UPDATE_BADGE_MUTATION = `
  mutation UpdateBadge($id: ID!, $input: UpdateBadgeInput!) {
    updateBadge(id: $id, input: $input) {
      id
      name
    }
  }
`;

export const DELETE_BADGE_MUTATION = `
  mutation DeleteBadge($id: ID!) {
    deleteBadge(id: $id)
  }
`;
