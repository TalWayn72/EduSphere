import { describe, it, expect } from 'vitest';
import { MY_CERTIFICATES_QUERY, CERTIFICATE_DOWNLOAD_URL_QUERY } from './certificate.queries';

describe('certificate.queries', () => {
  it('exports MY_CERTIFICATES_QUERY as a query DocumentNode', () => {
    expect(MY_CERTIFICATES_QUERY).toBeDefined();
    expect(MY_CERTIFICATES_QUERY.kind).toBe('Document');
    expect(MY_CERTIFICATES_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_CERTIFICATES_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyCertificates');
  });

  it('exports CERTIFICATE_DOWNLOAD_URL_QUERY as a query DocumentNode', () => {
    expect(CERTIFICATE_DOWNLOAD_URL_QUERY).toBeDefined();
    expect(CERTIFICATE_DOWNLOAD_URL_QUERY.kind).toBe('Document');
    expect(CERTIFICATE_DOWNLOAD_URL_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CERTIFICATE_DOWNLOAD_URL_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('CertificateDownloadUrl');
  });

});
