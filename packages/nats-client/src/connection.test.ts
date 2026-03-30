import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the nats module before importing the module under test
vi.mock('nats', () => ({
  nkeyAuthenticator: vi.fn((seed: Uint8Array) => ({
    type: 'nkey',
    seed,
  })),
}));

import { buildNatsOptions } from './connection';

describe('buildNatsOptions', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset relevant env vars
    delete process.env['NATS_URL'];
    delete process.env['NATS_TLS_CERT'];
    delete process.env['NATS_TLS_KEY'];
    delete process.env['NATS_TLS_CA'];
    delete process.env['NATS_NKEY'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns default NATS URL when NATS_URL is not set', () => {
    const options = buildNatsOptions();
    expect(options.servers).toBe('nats://localhost:4222');
  });

  it('uses NATS_URL from environment when set', () => {
    process.env['NATS_URL'] = 'nats://custom-host:5222';
    const options = buildNatsOptions();
    expect(options.servers).toBe('nats://custom-host:5222');
  });

  it('does not include TLS when only some TLS vars are set', () => {
    process.env['NATS_TLS_CERT'] = '/path/to/cert.pem';
    // keyFile and caFile not set
    const options = buildNatsOptions();
    expect(options.tls).toBeUndefined();
  });

  it('includes TLS config when all three TLS env vars are set (SI-7)', () => {
    process.env['NATS_TLS_CERT'] = '/path/to/cert.pem';
    process.env['NATS_TLS_KEY'] = '/path/to/key.pem';
    process.env['NATS_TLS_CA'] = '/path/to/ca.pem';

    const options = buildNatsOptions();
    expect(options.tls).toEqual({
      certFile: '/path/to/cert.pem',
      keyFile: '/path/to/key.pem',
      caFile: '/path/to/ca.pem',
    });
  });

  it('does not include authenticator when NATS_NKEY is not set', () => {
    const options = buildNatsOptions();
    expect(options.authenticator).toBeUndefined();
  });

  it('includes NKey authenticator when NATS_NKEY is set', () => {
    process.env['NATS_NKEY'] = 'SUAM_TEST_NKEY_SEED';
    const options = buildNatsOptions();
    expect(options.authenticator).toBeDefined();
  });

  it('combines TLS and NKey auth when both are configured', () => {
    process.env['NATS_TLS_CERT'] = '/cert.pem';
    process.env['NATS_TLS_KEY'] = '/key.pem';
    process.env['NATS_TLS_CA'] = '/ca.pem';
    process.env['NATS_NKEY'] = 'SUAM_TEST_NKEY';

    const options = buildNatsOptions();
    expect(options.tls).toBeDefined();
    expect(options.authenticator).toBeDefined();
    expect(options.servers).toBe('nats://localhost:4222');
  });
});
