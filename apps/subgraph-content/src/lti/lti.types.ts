/**
 * LTI 1.3 TypeScript interfaces — F-018
 */

export interface LtiLaunchParams {
  iss: string;
  login_hint: string;
  target_link_uri: string;
  lti_message_hint?: string;
  client_id?: string;
  deployment_id?: string;
}

export interface LtiIdToken {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  nonce: string;
  'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest';
  'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0';
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': string;
  'https://purl.imsglobal.org/spec/lti/claim/resource_link': { id: string; title?: string };
  'https://purl.imsglobal.org/spec/lti/claim/roles': string[];
  'https://purl.imsglobal.org/spec/lti/claim/context'?: { id: string; title?: string };
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

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

export interface RegisterLtiPlatformInput {
  platformName: string;
  platformUrl: string;
  clientId: string;
  authLoginUrl: string;
  authTokenUrl: string;
  keySetUrl: string;
  deploymentId: string;
}

export interface LtiLoginRedirect {
  redirectUrl: string;
  state: string;
  nonce: string;
}

export interface LtiCallbackResult {
  sessionToken: string;
  userId: string;
  courseId?: string;
  launchId: string;
}
