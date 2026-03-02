import { describe, it, expect, beforeEach } from 'vitest';
import {
  canonicalJson,
  loadKeyPair,
  signCredential,
  verifyCredentialSignature,
} from './open-badge.crypto.js';
import type { Ob3CredentialBody } from './open-badge.types.js';

// ── canonicalJson ─────────────────────────────────────────────────────────────

describe('canonicalJson', () => {
  it('sorts object keys alphabetically', () => {
    const input = { z: 1, a: 2, m: 3 };
    const result = canonicalJson(input);
    expect(result).toBe('{"a":2,"m":3,"z":1}');
  });

  it('maintains array element order (no sorting of arrays)', () => {
    const input = [3, 1, 2];
    const result = canonicalJson(input);
    expect(result).toBe('[3,1,2]');
  });

  it('handles arrays of strings maintaining insertion order', () => {
    const input = ['banana', 'apple', 'cherry'];
    const result = canonicalJson(input);
    expect(result).toBe('["banana","apple","cherry"]');
  });

  it('sorts keys in nested objects recursively', () => {
    const input = { outer: { z: 'last', a: 'first' }, b: 1, a: 2 };
    const result = canonicalJson(input);
    // outer object keys also sorted, top-level keys sorted
    expect(result).toBe('{"a":2,"b":1,"outer":{"a":"first","z":"last"}}');
  });

  it('handles null as a primitive', () => {
    expect(canonicalJson(null)).toBe('null');
  });

  it('handles number primitives', () => {
    expect(canonicalJson(42)).toBe('42');
  });

  it('handles string primitives', () => {
    expect(canonicalJson('hello')).toBe('"hello"');
  });

  it('handles boolean primitives', () => {
    expect(canonicalJson(true)).toBe('true');
    expect(canonicalJson(false)).toBe('false');
  });

  it('handles arrays of objects, sorting object keys within each element', () => {
    const input = [
      { z: 1, a: 2 },
      { y: 3, b: 4 },
    ];
    const result = canonicalJson(input);
    expect(result).toBe('[{"a":2,"z":1},{"b":4,"y":3}]');
  });

  it('omits undefined values from objects', () => {
    const input = { a: 1, b: undefined, c: 3 };
    const result = canonicalJson(input);
    expect(result).not.toContain('"b"');
    expect(result).toBe('{"a":1,"c":3}');
  });

  it('produces deterministic output for the same input regardless of insertion order', () => {
    const input1 = { b: 2, a: 1 };
    const input2 = { a: 1, b: 2 };
    expect(canonicalJson(input1)).toBe(canonicalJson(input2));
  });
});

// ── loadKeyPair ───────────────────────────────────────────────────────────────

describe('loadKeyPair', () => {
  beforeEach(() => {
    // Ensure we are in dev mode (no env var set)
    delete process.env.OPENBADGE_PRIVATE_KEY;
    delete process.env.OPENBADGE_ISSUER_DID;
    // Also ensure we are not in production
    process.env.NODE_ENV = 'test';
  });

  it('returns a key pair in dev mode (no env var)', () => {
    const kp = loadKeyPair();
    expect(kp).toBeDefined();
    expect(kp.privateKey).toBeDefined();
    expect(kp.publicKey).toBeDefined();
  });

  it('returns issuerDid with default did:web:edusphere.io when no env var', () => {
    const kp = loadKeyPair();
    expect(kp.issuerDid).toBe('did:web:edusphere.io');
  });

  it('returns issuerDid from OPENBADGE_ISSUER_DID env var when set', () => {
    process.env.OPENBADGE_ISSUER_DID = 'did:web:myschool.edu';
    const kp = loadKeyPair();
    expect(kp.issuerDid).toBe('did:web:myschool.edu');
    delete process.env.OPENBADGE_ISSUER_DID;
  });

  it('returns deterministic key pair across multiple calls (same dev seed)', () => {
    const kp1 = loadKeyPair();
    const kp2 = loadKeyPair();
    // Both should produce the same public key material
    expect(kp1.publicKey.export({ type: 'spki', format: 'der' })).toEqual(
      kp2.publicKey.export({ type: 'spki', format: 'der' })
    );
  });
});

// ── signCredential & verifyCredentialSignature ────────────────────────────────

function makeSampleCredential(): Ob3CredentialBody {
  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
    ],
    id: 'https://edusphere.io/ob3/assertion/test-001',
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: {
      id: 'did:web:edusphere.io',
      type: 'Profile',
      name: 'EduSphere',
    },
    issuanceDate: '2026-03-01T00:00:00Z',
    credentialSubject: {
      id: 'did:example:user-123',
      type: ['AchievementSubject'],
      achievement: {
        id: 'https://edusphere.io/ob3/badge/badge-abc',
        type: ['Achievement'],
        name: 'JavaScript Master',
        description: 'Awarded for mastering JavaScript',
        criteria: { narrative: 'Complete all JavaScript modules with >90%' },
      },
    },
  };
}

describe('signCredential', () => {
  it('returns a proof with type Ed25519Signature2020', () => {
    const kp = loadKeyPair();
    const credential = makeSampleCredential();
    const proof = signCredential(credential, kp);
    expect(proof.type).toBe('Ed25519Signature2020');
  });

  it('returns proof with verificationMethod containing issuerDid', () => {
    const kp = loadKeyPair();
    const credential = makeSampleCredential();
    const proof = signCredential(credential, kp);
    expect(proof.verificationMethod).toContain(kp.issuerDid);
    expect(proof.verificationMethod).toBe(`${kp.issuerDid}#key-1`);
  });

  it('returns proof with proofPurpose=assertionMethod', () => {
    const kp = loadKeyPair();
    const proof = signCredential(makeSampleCredential(), kp);
    expect(proof.proofPurpose).toBe('assertionMethod');
  });

  it('returns proof with a non-empty proofValue (base64url encoded signature)', () => {
    const kp = loadKeyPair();
    const proof = signCredential(makeSampleCredential(), kp);
    expect(proof.proofValue).toBeTruthy();
    expect(typeof proof.proofValue).toBe('string');
    expect(proof.proofValue.length).toBeGreaterThan(0);
  });

  it('returns proof with a valid ISO 8601 created timestamp', () => {
    const kp = loadKeyPair();
    const proof = signCredential(makeSampleCredential(), kp);
    const parsed = new Date(proof.created);
    expect(isNaN(parsed.getTime())).toBe(false);
  });
});

describe('verifyCredentialSignature', () => {
  it('returns true for a valid signature', () => {
    const kp = loadKeyPair();
    const credential = makeSampleCredential();
    const proof = signCredential(credential, kp);
    const valid = verifyCredentialSignature(credential, proof, kp.publicKey);
    expect(valid).toBe(true);
  });

  it('returns false when credential body has been tampered with', () => {
    const kp = loadKeyPair();
    const credential = makeSampleCredential();
    const proof = signCredential(credential, kp);

    // Tamper with the credential after signing
    const tampered: Ob3CredentialBody = {
      ...credential,
      issuer: { ...credential.issuer, name: 'FakeIssuer' },
    };

    const valid = verifyCredentialSignature(tampered, proof, kp.publicKey);
    expect(valid).toBe(false);
  });

  it('returns false when proofValue is corrupted', () => {
    const kp = loadKeyPair();
    const credential = makeSampleCredential();
    const proof = signCredential(credential, kp);

    const corruptedProof = { ...proof, proofValue: 'AAAA' + proof.proofValue };
    const valid = verifyCredentialSignature(
      credential,
      corruptedProof,
      kp.publicKey
    );
    expect(valid).toBe(false);
  });

  it('verifies that sign→verify round-trip works for different credential data', () => {
    const kp = loadKeyPair();
    const credential2: Ob3CredentialBody = {
      ...makeSampleCredential(),
      id: 'https://edusphere.io/ob3/assertion/test-002',
      issuanceDate: '2026-01-15T12:00:00Z',
    };
    const proof = signCredential(credential2, kp);
    expect(verifyCredentialSignature(credential2, proof, kp.publicKey)).toBe(
      true
    );
  });
});
