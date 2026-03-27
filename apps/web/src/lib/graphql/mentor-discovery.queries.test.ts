import { describe, it, expect } from 'vitest';
import { MENTORS_BY_PATH_QUERY, REQUEST_MENTOR_MATCH_MUTATION } from './mentor-discovery.queries';

describe('mentor-discovery.queries', () => {
  it('exports MENTORS_BY_PATH_QUERY as a query string', () => {
    expect(MENTORS_BY_PATH_QUERY).toBeDefined();
    expect(typeof MENTORS_BY_PATH_QUERY).toBe('string');
    expect(MENTORS_BY_PATH_QUERY).toContain('query MentorsByPathTopology');
  });

  it('exports REQUEST_MENTOR_MATCH_MUTATION as a mutation string', () => {
    expect(REQUEST_MENTOR_MATCH_MUTATION).toBeDefined();
    expect(typeof REQUEST_MENTOR_MATCH_MUTATION).toBe('string');
    expect(REQUEST_MENTOR_MATCH_MUTATION).toContain('mutation RequestPeerMatch');
  });

});
