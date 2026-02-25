/**
 * OpenBadges 3.0 Ed25519 cryptographic operations (F-025)
 * Uses Node.js built-in `crypto` module — no external libraries.
 *
 * Key management:
 *   OPENBADGE_PRIVATE_KEY — base64-encoded 32-byte Ed25519 seed (PKCS#8 DER or raw seed)
 *   OPENBADGE_ISSUER_DID  — e.g. "did:web:edusphere.io"
 */
import {
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
  type KeyObject,
} from 'crypto';
import type { Ob3CredentialBody, OpenBadgeProof } from './open-badge.types.js';

// ── Key pair cache (loaded once on init) ──────────────────────────────────────

export interface Ed25519KeyPair {
  readonly privateKey: KeyObject;
  readonly publicKey: KeyObject;
  readonly issuerDid: string;
}

/**
 * Load Ed25519 key pair from environment variables.
 * Expects OPENBADGE_PRIVATE_KEY as base64 of PKCS#8 DER-encoded private key.
 * Throws in production if variables are missing; warns in development.
 */
export function loadKeyPair(): Ed25519KeyPair {
  const privateKeyB64 = process.env.OPENBADGE_PRIVATE_KEY;
  const issuerDid = process.env.OPENBADGE_ISSUER_DID ?? 'did:web:edusphere.io';

  if (!privateKeyB64) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('OPENBADGE_PRIVATE_KEY is required in production');
    }
    // Development fallback: generate a deterministic test key from fixed seed
    return generateDevKeyPair(issuerDid);
  }

  const keyDer = Buffer.from(privateKeyB64, 'base64');
  const privateKey = loadPrivateKeyFromBuffer(keyDer);
  const publicKey = createPublicKey(privateKey);
  return { privateKey, publicKey, issuerDid };
}

function loadPrivateKeyFromBuffer(keyDer: Buffer): KeyObject {
  // Try PKCS#8 DER first (preferred)
  if (keyDer.length > 32) {
    return createPrivateKey({ key: keyDer, format: 'der', type: 'pkcs8' });
  }
  // Fallback: treat as raw 32-byte Ed25519 seed → wrap in PKCS#8
  const pkcs8Header = Buffer.from(
    '302e020100300506032b657004220420',
    'hex',
  );
  const pkcs8Der = Buffer.concat([pkcs8Header, keyDer]);
  return createPrivateKey({ key: pkcs8Der, format: 'der', type: 'pkcs8' });
}

function generateDevKeyPair(issuerDid: string): Ed25519KeyPair {
  // Fixed-seed dev key: DO NOT use in production
  const seed = Buffer.from('edusphere-dev-key-seed-2026-test', 'utf8').subarray(0, 32);
  const pkcs8Header = Buffer.from('302e020100300506032b657004220420', 'hex');
  const pkcs8Der = Buffer.concat([pkcs8Header, seed]);
  const privateKey = createPrivateKey({ key: pkcs8Der, format: 'der', type: 'pkcs8' });
  const publicKey = createPublicKey(privateKey);
  return { privateKey, publicKey, issuerDid };
}

// ── Canonical JSON serialization (deterministic) ──────────────────────────────

/**
 * Produces a deterministically sorted JSON string suitable for signing.
 * Object keys are sorted recursively; arrays maintain order.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

// ── Signing & Verification ────────────────────────────────────────────────────

/**
 * Sign an OB3 credential body (without proof field).
 * Returns the proof object to attach to the credential.
 */
export function signCredential(
  credentialBody: Ob3CredentialBody,
  keyPair: Ed25519KeyPair,
): OpenBadgeProof {
  const canonical = canonicalJson(credentialBody);
  const signature = sign(null, Buffer.from(canonical, 'utf8'), keyPair.privateKey);
  const proofValue = signature.toString('base64url');

  return {
    type: 'Ed25519Signature2020',
    created: new Date().toISOString(),
    verificationMethod: `${keyPair.issuerDid}#key-1`,
    proofPurpose: 'assertionMethod',
    proofValue,
  };
}

/**
 * Verify an OB3 credential.
 * Reconstructs the canonical body (minus proof), verifies Ed25519 signature.
 */
export function verifyCredentialSignature(
  credentialBody: Ob3CredentialBody,
  proof: OpenBadgeProof,
  publicKey: KeyObject,
): boolean {
  try {
    const canonical = canonicalJson(credentialBody);
    const signatureBuffer = Buffer.from(proof.proofValue, 'base64url');
    return verify(null, Buffer.from(canonical, 'utf8'), publicKey, signatureBuffer);
  } catch {
    return false;
  }
}
