export const directiveTypeDefs = `
  directive @authenticated on FIELD_DEFINITION | OBJECT
  directive @requiresScopes(scopes: [String!]!) on FIELD_DEFINITION
  directive @requiresRole(roles: [String!]!) on FIELD_DEFINITION
  directive @rateLimit(limit: Int!, window: Int!) on FIELD_DEFINITION
`;

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT = 'STUDENT',
  RESEARCHER = 'RESEARCHER',
}

export enum AuthScope {
  READ_USERS = 'read:users',
  WRITE_USERS = 'write:users',
  READ_CONTENT = 'read:content',
  WRITE_CONTENT = 'write:content',
  READ_ANNOTATIONS = 'read:annotations',
  WRITE_ANNOTATIONS = 'write:annotations',
  MANAGE_ORG = 'manage:org',
  ADMIN = 'admin',
}
