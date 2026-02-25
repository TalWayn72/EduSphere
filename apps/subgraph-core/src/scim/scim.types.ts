/**
 * SCIM 2.0 standard types — RFC 7643 / RFC 7644
 * Used by ScimController (HTTP) and ScimUserService (business logic).
 */

export interface ScimUser {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'];
  id?: string;
  externalId?: string;
  userName: string;
  name?: {
    givenName?: string;
    familyName?: string;
    formatted?: string;
  };
  emails?: Array<{ value: string; primary?: boolean; type?: string }>;
  active?: boolean;
  groups?: Array<{ value: string; display?: string }>;
  'urn:edusphere:scim:extension'?: {
    role?: string;
    department?: string;
    courseIds?: string[];
  };
}

export interface ScimGroup {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'];
  id?: string;
  externalId?: string;
  displayName: string;
  members?: Array<{ value: string; display?: string }>;
  'urn:edusphere:scim:extension'?: {
    courseIds?: string[]; // auto-enroll group members in these courses
  };
}

export interface ScimListResponse<T> {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
}

export interface ScimError {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'];
  status: number;
  detail: string;
}

/** SCIM PATCH operation per RFC 7644 §3.5.2 */
export interface ScimPatchOp {
  op: 'add' | 'remove' | 'replace';
  path?: string;
  value?: unknown;
}

export interface ScimPatchRequest {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'];
  Operations: ScimPatchOp[];
}

export interface ServiceProviderConfig {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'];
  patch: { supported: boolean };
  bulk: { supported: boolean; maxOperations: number; maxPayloadSize: number };
  filter: { supported: boolean; maxResults: number };
  changePassword: { supported: boolean };
  sort: { supported: boolean };
  etag: { supported: boolean };
  authenticationSchemes: Array<{
    type: string;
    name: string;
    description: string;
  }>;
}
