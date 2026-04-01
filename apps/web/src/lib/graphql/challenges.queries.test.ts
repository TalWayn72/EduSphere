import { describe, it, expect } from 'vitest';
import {
  ACTIVE_CHALLENGES_QUERY,
  MY_PARTICIPATIONS_QUERY,
  CHALLENGE_LEADERBOARD_QUERY,
  JOIN_CHALLENGE_MUTATION,
  SUBMIT_SCORE_MUTATION,
} from './challenges.queries';

describe('challenges.queries', () => {
  it('exports ACTIVE_CHALLENGES_QUERY as a query string', () => {
    expect(ACTIVE_CHALLENGES_QUERY).toBeDefined();
    expect(typeof ACTIVE_CHALLENGES_QUERY).toBe('string');
    expect(ACTIVE_CHALLENGES_QUERY).toContain('query ActiveChallenges');
  });

  it('exports MY_PARTICIPATIONS_QUERY as a query string', () => {
    expect(MY_PARTICIPATIONS_QUERY).toBeDefined();
    expect(typeof MY_PARTICIPATIONS_QUERY).toBe('string');
    expect(MY_PARTICIPATIONS_QUERY).toContain(
      'query MyChallengeParticipations'
    );
  });

  it('exports CHALLENGE_LEADERBOARD_QUERY as a query string', () => {
    expect(CHALLENGE_LEADERBOARD_QUERY).toBeDefined();
    expect(typeof CHALLENGE_LEADERBOARD_QUERY).toBe('string');
    expect(CHALLENGE_LEADERBOARD_QUERY).toContain('query ChallengeLeaderboard');
  });

  it('exports JOIN_CHALLENGE_MUTATION as a mutation string', () => {
    expect(JOIN_CHALLENGE_MUTATION).toBeDefined();
    expect(typeof JOIN_CHALLENGE_MUTATION).toBe('string');
    expect(JOIN_CHALLENGE_MUTATION).toContain('mutation JoinChallenge');
  });

  it('exports SUBMIT_SCORE_MUTATION as a mutation string', () => {
    expect(SUBMIT_SCORE_MUTATION).toBeDefined();
    expect(typeof SUBMIT_SCORE_MUTATION).toBe('string');
    expect(SUBMIT_SCORE_MUTATION).toContain('mutation SubmitChallengeScore');
  });
});
