import { describe, it, expect } from 'vitest';
import { FIND_CHAVRUTA_PARTNERS_QUERY, CREATE_CHAVRUTA_SESSION_MUTATION } from './chavruta-partner.queries';

describe('chavruta-partner.queries', () => {
  it('exports FIND_CHAVRUTA_PARTNERS_QUERY as a query string', () => {
    expect(FIND_CHAVRUTA_PARTNERS_QUERY).toBeDefined();
    expect(typeof FIND_CHAVRUTA_PARTNERS_QUERY).toBe('string');
    expect(FIND_CHAVRUTA_PARTNERS_QUERY).toContain('query FindChavrutaPartners');
  });

  it('exports CREATE_CHAVRUTA_SESSION_MUTATION as a mutation string', () => {
    expect(CREATE_CHAVRUTA_SESSION_MUTATION).toBeDefined();
    expect(typeof CREATE_CHAVRUTA_SESSION_MUTATION).toBe('string');
    expect(CREATE_CHAVRUTA_SESSION_MUTATION).toContain('mutation CreateChavrutaPartnerSession');
  });

});
