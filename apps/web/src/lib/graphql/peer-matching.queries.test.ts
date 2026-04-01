import { describe, it, expect } from 'vitest';
import {
  PEER_MATCHES_QUERY,
  MY_MATCH_REQUESTS_QUERY,
  REQUEST_PEER_MATCH_MUTATION,
  RESPOND_PEER_MATCH_MUTATION,
} from './peer-matching.queries';

describe('peer-matching.queries', () => {
  it('exports PEER_MATCHES_QUERY as a query string', () => {
    expect(PEER_MATCHES_QUERY).toBeDefined();
    expect(typeof PEER_MATCHES_QUERY).toBe('string');
    expect(PEER_MATCHES_QUERY).toContain('query PeerMatches');
  });

  it('exports MY_MATCH_REQUESTS_QUERY as a query string', () => {
    expect(MY_MATCH_REQUESTS_QUERY).toBeDefined();
    expect(typeof MY_MATCH_REQUESTS_QUERY).toBe('string');
    expect(MY_MATCH_REQUESTS_QUERY).toContain('query MyPeerMatchRequests');
  });

  it('exports REQUEST_PEER_MATCH_MUTATION as a mutation string', () => {
    expect(REQUEST_PEER_MATCH_MUTATION).toBeDefined();
    expect(typeof REQUEST_PEER_MATCH_MUTATION).toBe('string');
    expect(REQUEST_PEER_MATCH_MUTATION).toContain('mutation RequestPeerMatch');
  });

  it('exports RESPOND_PEER_MATCH_MUTATION as a mutation string', () => {
    expect(RESPOND_PEER_MATCH_MUTATION).toBeDefined();
    expect(typeof RESPOND_PEER_MATCH_MUTATION).toBe('string');
    expect(RESPOND_PEER_MATCH_MUTATION).toContain(
      'mutation RespondToPeerMatch'
    );
  });
});
