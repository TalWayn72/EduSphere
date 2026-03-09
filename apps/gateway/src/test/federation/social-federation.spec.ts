/**
 * Phase 45 — Social Learning federation regression test.
 * Verifies that all Social, Discussion and Assessment queries/mutations/types
 * are correctly wired into supergraph.graphql.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

let supergraph: string;

beforeAll(() => {
  supergraph = readFileSync(
    join(__dirname, '../../../supergraph.graphql'),
    'utf8'
  );
});

describe('Phase 45 — Social Learning Federation', () => {
  describe('Social queries wired (CORE subgraph)', () => {
    it('myFollowers query exists in supergraph', () => {
      expect(supergraph).toMatch(/myFollowers[^}]*@join__field\(graph: CORE\)/);
    });

    it('myFollowing query exists in supergraph', () => {
      expect(supergraph).toMatch(/myFollowing[^}]*@join__field\(graph: CORE\)/);
    });

    it('searchUsers query exists in supergraph routed to CORE', () => {
      expect(supergraph).toMatch(/searchUsers[^}]*@join__field\(graph: CORE\)/);
    });

    it('publicProfile query exists in supergraph', () => {
      expect(supergraph).toMatch(/publicProfile[^}]*@join__field\(graph: CORE\)/);
    });

    it('myActivityFeed query exists in supergraph', () => {
      expect(supergraph).toMatch(/myActivityFeed[^}]*@join__field\(graph: CORE\)/);
    });
  });

  describe('Social feed queries wired (KNOWLEDGE subgraph)', () => {
    it('socialFeed query exists in supergraph', () => {
      expect(supergraph).toMatch(/socialFeed[^}]*@join__field\(graph: KNOWLEDGE\)/);
    });

    it('socialRecommendations query exists in supergraph', () => {
      expect(supergraph).toMatch(/socialRecommendations[^}]*@join__field\(graph: KNOWLEDGE\)/);
    });
  });

  describe('Discussion queries wired (COLLABORATION subgraph)', () => {
    it('discussion query exists in supergraph', () => {
      expect(supergraph).toMatch(/discussion\(id[^}]*@join__field\(graph: COLLABORATION\)/);
    });

    it('discussions query exists in supergraph', () => {
      expect(supergraph).toMatch(/discussions\(courseId[^}]*@join__field\(graph: COLLABORATION\)/);
    });

    it('myDiscussions query exists in supergraph', () => {
      expect(supergraph).toMatch(/myDiscussions[^}]*@join__field\(graph: COLLABORATION\)/);
    });

    it('discussionMessages query exists in supergraph', () => {
      expect(supergraph).toMatch(/discussionMessages[^}]*@join__field\(graph: COLLABORATION\)/);
    });

    it('messageAdded subscription exists in supergraph', () => {
      expect(supergraph).toMatch(/messageAdded[^}]*@join__field\(graph: COLLABORATION\)/);
    });
  });

  describe('Discussion mutations wired (COLLABORATION subgraph)', () => {
    it('createDiscussion mutation exists in supergraph', () => {
      expect(supergraph).toMatch(/createDiscussion[^}]*@join__field\(graph: COLLABORATION\)/);
    });

    it('addMessage mutation exists in supergraph', () => {
      expect(supergraph).toMatch(/addMessage[^}]*@join__field\(graph: COLLABORATION\)/);
    });

    it('joinDiscussion mutation exists in supergraph', () => {
      expect(supergraph).toMatch(/joinDiscussion[^}]*@join__field\(graph: COLLABORATION\)/);
    });

    it('leaveDiscussion mutation exists in supergraph', () => {
      expect(supergraph).toMatch(/leaveDiscussion[^}]*@join__field\(graph: COLLABORATION\)/);
    });

    it('likeMessage mutation exists in supergraph routed to COLLABORATION', () => {
      expect(supergraph).toMatch(/likeMessage[^}]*@join__field\(graph: COLLABORATION\)/);
    });
  });

  describe('Social mutations wired (CORE subgraph)', () => {
    it('followUser mutation exists in supergraph', () => {
      expect(supergraph).toMatch(/followUser[^}]*@join__field\(graph: CORE\)/);
    });

    it('unfollowUser mutation exists in supergraph', () => {
      expect(supergraph).toMatch(/unfollowUser[^}]*@join__field\(graph: CORE\)/);
    });
  });

  describe('Assessment queries wired (CONTENT subgraph)', () => {
    it('myCampaigns query exists in supergraph', () => {
      expect(supergraph).toMatch(/myCampaigns[^}]*@join__field\(graph: CONTENT\)/);
    });

    it('campaignsToRespond query exists in supergraph', () => {
      expect(supergraph).toMatch(/campaignsToRespond[^}]*@join__field\(graph: CONTENT\)/);
    });

    it('assessmentResult query exists in supergraph', () => {
      expect(supergraph).toMatch(/assessmentResult[^}]*@join__field\(graph: CONTENT\)/);
    });
  });

  describe('Assessment mutations wired (CONTENT subgraph)', () => {
    it('createAssessmentCampaign mutation exists in supergraph', () => {
      expect(supergraph).toMatch(/createAssessmentCampaign[^}]*@join__field\(graph: CONTENT\)/);
    });

    it('submitAssessmentResponse mutation exists in supergraph', () => {
      expect(supergraph).toMatch(/submitAssessmentResponse[^)]*campaignId[^}]*@join__field\(graph: CONTENT\)/s);
    });

    it('activateAssessmentCampaign mutation exists in supergraph', () => {
      expect(supergraph).toMatch(/activateAssessmentCampaign[^}]*@join__field\(graph: CONTENT\)/);
    });

    it('completeAssessmentCampaign mutation exists in supergraph', () => {
      expect(supergraph).toMatch(/completeAssessmentCampaign[^}]*@join__field\(graph: CONTENT\)/);
    });
  });

  describe('Social types defined in supergraph', () => {
    it('SocialFeedItem type exists', () => {
      expect(supergraph).toMatch(/type SocialFeedItem/);
    });

    it('SocialVerb enum exists', () => {
      expect(supergraph).toMatch(/enum SocialVerb/);
    });

    it('SocialRecommendation type exists', () => {
      expect(supergraph).toMatch(/type SocialRecommendation/);
    });

    it('PublicProfile type exists', () => {
      expect(supergraph).toMatch(/type PublicProfile/);
    });
  });

  describe('Discussion types defined in supergraph', () => {
    it('Discussion type exists', () => {
      expect(supergraph).toMatch(/type Discussion[^M]/);
    });

    it('DiscussionMessage type exists', () => {
      expect(supergraph).toMatch(/type DiscussionMessage/);
    });

    it('DiscussionMessage has likesCount field', () => {
      const idx = supergraph.indexOf('type DiscussionMessage');
      expect(idx).toBeGreaterThan(0);
      const block = supergraph.slice(idx, supergraph.indexOf('}', idx) + 1);
      expect(block).toMatch(/likesCount.*Int/);
    });

    it('DiscussionMessage has isLikedByMe field', () => {
      const idx = supergraph.indexOf('type DiscussionMessage');
      expect(idx).toBeGreaterThan(0);
      const block = supergraph.slice(idx, supergraph.indexOf('}', idx) + 1);
      expect(block).toMatch(/isLikedByMe.*Boolean/);
    });
  });

  describe('Assessment types defined in supergraph', () => {
    it('AssessmentCampaign type exists', () => {
      expect(supergraph).toMatch(/type AssessmentCampaign/);
    });

    it('AssessmentResult type exists', () => {
      expect(supergraph).toMatch(/type AssessmentResult/);
    });

    it('RaterRole enum exists', () => {
      expect(supergraph).toMatch(/enum RaterRole/);
    });
  });

  describe('SDL source files match supergraph entries', () => {
    let socialSdl: string;
    let discussionSdl: string;
    let assessmentSdl: string;

    beforeAll(() => {
      socialSdl = readFileSync(
        join(__dirname, '../../../../subgraph-core/src/social/social.graphql'),
        'utf8'
      );
      discussionSdl = readFileSync(
        join(
          __dirname,
          '../../../../subgraph-collaboration/src/discussion/discussion.graphql'
        ),
        'utf8'
      );
      assessmentSdl = readFileSync(
        join(
          __dirname,
          '../../../../subgraph-content/src/assessment/assessment.graphql'
        ),
        'utf8'
      );
    });

    it('searchUsers is declared in CORE social SDL', () => {
      expect(socialSdl).toContain('searchUsers');
    });

    it('likeMessage is declared in COLLABORATION discussion SDL', () => {
      expect(discussionSdl).toContain('likeMessage');
    });

    it('likesCount field is declared on DiscussionMessage in collaboration SDL', () => {
      expect(discussionSdl).toContain('likesCount');
    });

    it('isLikedByMe field is declared on DiscussionMessage in collaboration SDL', () => {
      expect(discussionSdl).toContain('isLikedByMe');
    });

    it('myCampaigns is declared in CONTENT assessment SDL', () => {
      expect(assessmentSdl).toContain('myCampaigns');
    });

    it('AssessmentCampaign type is declared in CONTENT assessment SDL', () => {
      expect(assessmentSdl).toContain('type AssessmentCampaign');
    });
  });
});
