/**
 * OpenBadges 3.0 shared types — W3C Verifiable Credentials format (F-025)
 * See: https://www.imsglobal.org/spec/ob/v3p0/
 */
import type { KeyObject } from 'crypto';

// ── Ed25519 key pair (re-exported for service consumers) ──────────────────────
export interface Ed25519KeyPair {
  readonly privateKey: KeyObject;
  readonly publicKey: KeyObject;
  readonly issuerDid: string;
}

// ── JSON-LD Proof (Ed25519Signature2020) ──────────────────────────────────────
export interface OpenBadgeProof {
  readonly type: 'Ed25519Signature2020';
  readonly created: string;          // ISO 8601
  readonly verificationMethod: string; // "{issuerDid}#key-1"
  readonly proofPurpose: 'assertionMethod';
  readonly proofValue: string;       // base64url-encoded Ed25519 signature
}

// ── OpenBadges 3.0 JSON-LD Achievement (badge definition) ────────────────────
export interface Ob3Achievement {
  readonly id: string;               // URL: /ob3/badge/{definitionId}
  readonly type: ['Achievement'];
  readonly name: string;
  readonly description: string;
  readonly criteria: { readonly narrative: string };
  readonly image?: { readonly id: string; readonly type: 'Image' };
}

// ── OpenBadges 3.0 JSON-LD Credential Subject ────────────────────────────────
export interface Ob3CredentialSubject {
  readonly id: string;               // did:example:{userId}
  readonly type: ['AchievementSubject'];
  readonly achievement: Ob3Achievement;
}

// ── Full OpenBadges 3.0 JSON-LD Credential (without proof) ───────────────────
export interface Ob3CredentialBody {
  readonly '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
  ];
  readonly id: string;               // URL: /ob3/assertion/{assertionId}
  readonly type: ['VerifiableCredential', 'OpenBadgeCredential'];
  readonly issuer: {
    readonly id: string;             // DID
    readonly type: 'Profile';
    readonly name: string;
  };
  readonly issuanceDate: string;     // ISO 8601
  readonly expirationDate?: string;  // ISO 8601
  readonly credentialSubject: Ob3CredentialSubject;
}

// ── Full signed credential (body + proof) ─────────────────────────────────────
export interface Ob3Credential extends Ob3CredentialBody {
  readonly proof: OpenBadgeProof;
}

// ── Service input types ────────────────────────────────────────────────────────
export interface IssueCredentialInput {
  readonly userId: string;
  readonly badgeDefinitionId: string;
  readonly tenantId: string;
  readonly evidenceUrl?: string;
  readonly expiresAt?: Date;
}

export interface CreateBadgeDefinitionInput {
  readonly name: string;
  readonly description: string;
  readonly imageUrl?: string;
  readonly criteriaUrl?: string;
  readonly tags?: string[];
}

// ── Service result type ───────────────────────────────────────────────────────
export interface BadgeAssertionResult {
  readonly id: string;
  readonly badgeDefinitionId: string;
  readonly badgeName: string;
  readonly badgeDescription: string;
  readonly recipientId: string;
  readonly issuedAt: string;
  readonly expiresAt: string | null;
  readonly evidenceUrl: string | null;
  readonly revoked: boolean;
  readonly verifyUrl: string;
  readonly shareUrl: string;
  readonly proof: OpenBadgeProof;
}

export interface VerificationResult {
  readonly valid: boolean;
  readonly error?: string;
  readonly assertion?: BadgeAssertionResult;
}

// ── LinkedIn share URL builder ────────────────────────────────────────────────
export function buildLinkedInShareUrl(
  badgeName: string,
  issuedAt: string,
  verifyUrl: string,
): string {
  const issued = new Date(issuedAt);
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: badgeName,
    organizationName: 'EduSphere',
    issueYear: String(issued.getFullYear()),
    issueMonth: String(issued.getMonth() + 1),
    certUrl: verifyUrl,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}
