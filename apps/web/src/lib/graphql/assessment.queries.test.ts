import { describe, it, expect } from 'vitest';
import {
  MY_CAMPAIGNS_QUERY,
  CAMPAIGNS_TO_RESPOND_QUERY,
  CREATE_CAMPAIGN_MUTATION,
  ACTIVATE_CAMPAIGN_MUTATION,
  COMPLETE_CAMPAIGN_MUTATION,
  ASSESSMENT_RESULT_QUERY,
  SUBMIT_RESPONSE_MUTATION,
} from './assessment.queries';

describe('assessment.queries', () => {
  it('exports MY_CAMPAIGNS_QUERY as a query string', () => {
    expect(MY_CAMPAIGNS_QUERY).toBeDefined();
    expect(typeof MY_CAMPAIGNS_QUERY).toBe('string');
    expect(MY_CAMPAIGNS_QUERY).toContain('query MyCampaigns');
  });

  it('exports CAMPAIGNS_TO_RESPOND_QUERY as a query string', () => {
    expect(CAMPAIGNS_TO_RESPOND_QUERY).toBeDefined();
    expect(typeof CAMPAIGNS_TO_RESPOND_QUERY).toBe('string');
    expect(CAMPAIGNS_TO_RESPOND_QUERY).toContain('query CampaignsToRespond');
  });

  it('exports CREATE_CAMPAIGN_MUTATION as a mutation string', () => {
    expect(CREATE_CAMPAIGN_MUTATION).toBeDefined();
    expect(typeof CREATE_CAMPAIGN_MUTATION).toBe('string');
    expect(CREATE_CAMPAIGN_MUTATION).toContain(
      'mutation CreateAssessmentCampaign'
    );
  });

  it('exports ACTIVATE_CAMPAIGN_MUTATION as a mutation string', () => {
    expect(ACTIVATE_CAMPAIGN_MUTATION).toBeDefined();
    expect(typeof ACTIVATE_CAMPAIGN_MUTATION).toBe('string');
    expect(ACTIVATE_CAMPAIGN_MUTATION).toContain('mutation ActivateCampaign');
  });

  it('exports COMPLETE_CAMPAIGN_MUTATION as a mutation string', () => {
    expect(COMPLETE_CAMPAIGN_MUTATION).toBeDefined();
    expect(typeof COMPLETE_CAMPAIGN_MUTATION).toBe('string');
    expect(COMPLETE_CAMPAIGN_MUTATION).toContain('mutation CompleteCampaign');
  });

  it('exports ASSESSMENT_RESULT_QUERY as a query string', () => {
    expect(ASSESSMENT_RESULT_QUERY).toBeDefined();
    expect(typeof ASSESSMENT_RESULT_QUERY).toBe('string');
    expect(ASSESSMENT_RESULT_QUERY).toContain('query AssessmentResult');
  });

  it('exports SUBMIT_RESPONSE_MUTATION as a mutation string', () => {
    expect(SUBMIT_RESPONSE_MUTATION).toBeDefined();
    expect(typeof SUBMIT_RESPONSE_MUTATION).toBe('string');
    expect(SUBMIT_RESPONSE_MUTATION).toContain(
      'mutation SubmitAssessmentResponse'
    );
  });
});
