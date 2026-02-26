export const ADMIN_AUDIT_LOG_QUERY = `
  query AdminAuditLog(
    $limit: Int
    $offset: Int
    $action: String
    $userId: ID
    $since: String
    $until: String
  ) {
    adminAuditLog(
      limit: $limit
      offset: $offset
      action: $action
      userId: $userId
      since: $since
      until: $until
    ) {
      entries {
        id
        action
        userId
        resourceType
        resourceId
        status
        ipAddress
        createdAt
      }
      total
    }
  }
`;
