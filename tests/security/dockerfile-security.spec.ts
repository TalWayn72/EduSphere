/**
 * G-05 Security Test: Dockerfile SSL Verification Bypass
 *
 * Static content test — validates the root Dockerfile does not contain any
 * SSL verification bypass flags that would enable MITM attacks in the build
 * pipeline.  No Docker daemon or running containers required.
 */

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const DOCKERFILE_PATH = resolve(join(import.meta.dirname, '../../Dockerfile'));

function loadDockerfile(): string {
  return readFileSync(DOCKERFILE_PATH, 'utf-8');
}

describe('Dockerfile SSL security (G-05)', () => {
  let content: string;

  beforeAll(() => {
    content = loadDockerfile();
  });

  it('does not contain curl --insecure flag', () => {
    expect(content).not.toContain('--insecure');
  });

  it('does not contain curl -k shorthand flag', () => {
    // Match " -k " as a standalone flag (not part of a longer option like -kv)
    expect(content).not.toMatch(/ -k /);
  });

  it('does not disable APT SSL peer verification', () => {
    expect(content).not.toContain('Verify-Peer "false"');
  });

  it('does not disable APT SSL host verification', () => {
    expect(content).not.toContain('Verify-Host "false"');
  });

  it('does not allow insecure APT repositories', () => {
    expect(content).not.toContain('AllowInsecureRepositories');
  });

  it('does not write an insecure APT config file', () => {
    expect(content).not.toContain('99insecure');
  });

  it('does not use wget --no-check-certificate', () => {
    expect(content).not.toContain('--no-check-certificate');
  });

  it('does not disable Git SSL verification via ENV', () => {
    expect(content).not.toContain('GIT_SSL_NO_VERIFY');
  });

  it('does not disable Node.js TLS verification via ENV', () => {
    expect(content).not.toContain('NODE_TLS_REJECT_UNAUTHORIZED');
  });
});
