/**
 * LTI 1.3 Types
 * IMS Global LTI 1.3 / LTI Advantage specification types.
 */

// ── DTOs ─────────────────────────────────────────────────────────────────────

/** Body of the OIDC Login Initiation request sent by the platform. */
export interface LtiLoginRequest {
  /** Platform issuer identifier (must match registered platform). */
  iss: string;
  /** Opaque login hint provided by the platform. */
  login_hint: string;
  /** Target link URI the tool should load after launch. */
  target_link_uri: string;
  /** Optional: LTI message hint forwarded to the authentication response. */
  lti_message_hint?: string;
  /** Optional: Client ID registered for this tool. */
  client_id?: string;
  /** Optional: Deployment ID. */
  lti_deployment_id?: string;
}

/** Body of the LTI Launch request (POST from platform after OIDC redirect). */
export interface LtiLaunchRequest {
  /** Signed JWT containing LTI claims. */
  id_token: string;
  /** State value echoed back from the login initiation redirect. */
  state: string;
}

// ── LTI Claim Interfaces ──────────────────────────────────────────────────────

/** Standard LTI 1.3 resource link claim. */
export interface LtiResourceLinkClaim {
  /** Unique identifier for the resource link in the platform. */
  id: string;
  /** Human-readable title of the resource link. */
  title?: string;
  /** Human-readable description. */
  description?: string;
}

/** LTI 1.3 context (course/section) claim. */
export interface LtiContextClaim {
  /** Unique identifier for the context. */
  id: string;
  /** Human-readable label. */
  label?: string;
  /** Human-readable title. */
  title?: string;
  /** Context type URIs. */
  type?: string[];
}

/** LTI 1.3 "names and roles" service claim. */
export interface LtiNamesAndRolesClaim {
  context_memberships_url: string;
  service_versions: string[];
}

/**
 * Validated LTI 1.3 JWT claims (standard + LTI-specific).
 * Claim URIs defined by IMS Global specification.
 */
export interface LtiClaims {
  /** Subject — the end-user identifier on the platform. */
  sub: string;
  /** JWT issuer (platform identifier). */
  iss: string;
  /** Client ID / audience. */
  aud: string | string[];
  /** Expiry (Unix epoch seconds). */
  exp: number;
  /** Issued-at (Unix epoch seconds). */
  iat: number;
  /** Nonce — must match the value stored during login initiation. */
  nonce: string;
  /** Optional: user's given name. */
  given_name?: string;
  /** Optional: user's family name. */
  family_name?: string;
  /** Optional: user's email address. */
  email?: string;

  // ── LTI-specific claims ───────────────────────────────────────────────────

  /** LTI version ("1.3.0"). */
  'https://purl.imsglobal.org/spec/lti/claim/version': string;
  /** LTI message type ("LtiResourceLinkRequest" | "LtiDeepLinkingRequest"). */
  'https://purl.imsglobal.org/spec/lti/claim/message_type': string;
  /** Deployment ID. */
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': string;
  /** Target link URI. */
  'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': string;
  /** Resource link info. */
  'https://purl.imsglobal.org/spec/lti/claim/resource_link': LtiResourceLinkClaim;
  /** Roles claimed by this user (IMS URIs). */
  'https://purl.imsglobal.org/spec/lti/claim/roles': string[];
  /** Optional: context (course/section) the launch originates from. */
  'https://purl.imsglobal.org/spec/lti/claim/context'?: LtiContextClaim;
  /** Optional: names and roles provisioning service. */
  'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'?: LtiNamesAndRolesClaim;
  /** Optional: custom parameters defined by the deployment. */
  'https://purl.imsglobal.org/spec/lti/claim/custom'?: Record<string, string>;
}

// ── Platform Configuration ────────────────────────────────────────────────────

/**
 * Registered LTI platform (Tool Consumer) configuration.
 * Loaded from environment variables; one platform supported per deployment.
 */
export interface LtiPlatformConfig {
  /** Platform issuer URI (must match `iss` in JWT). */
  issuer: string;
  /** Client ID registered on the platform for this tool. */
  clientId: string;
  /** Platform OIDC authentication endpoint. */
  authEndpoint: string;
  /** Platform JWKS URI used to verify id_token signatures. */
  jwksUri: string;
}

// ── Stored State ──────────────────────────────────────────────────────────────

/** Value stored in Redis keyed by `lti:state:<state>` during login initiation. */
export interface LtiStatePayload {
  /** Nonce to embed in the authentication request and verify on launch. */
  nonce: string;
  /** Login hint forwarded from the platform. */
  loginHint: string;
  /** ISO timestamp of when the state was created. */
  createdAt: string;
}

// ── Legacy / DB-backed interfaces (F-018) ─────────────────────────────────────

/** @deprecated Use LtiClaims + LtiLoginRequest instead. Kept for DB-backed impl. */
export interface LtiLaunchParams {
  iss: string;
  login_hint: string;
  target_link_uri: string;
  lti_message_hint?: string;
  client_id?: string;
  deployment_id?: string;
}

/** LTI platform DB row DTO. */
export interface LtiPlatformDto {
  id: string;
  tenantId: string;
  platformName: string;
  platformUrl: string;
  clientId: string;
  authLoginUrl: string;
  authTokenUrl: string;
  keySetUrl: string;
  deploymentId: string;
  isActive: boolean;
}

/** Input for registering a new LTI platform. */
export interface RegisterLtiPlatformInput {
  platformName: string;
  platformUrl: string;
  clientId: string;
  authLoginUrl: string;
  authTokenUrl: string;
  keySetUrl: string;
  deploymentId: string;
}

/** Result of a successful login initiation redirect. */
export interface LtiLoginRedirect {
  redirectUrl: string;
  state: string;
  nonce: string;
}

/** Result of a successful LTI callback / launch. */
export interface LtiCallbackResult {
  sessionToken: string;
  userId: string;
  courseId?: string;
  launchId: string;
}
