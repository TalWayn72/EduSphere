import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import * as urql from 'urql';
import { AssessmentCampaignPage } from './AssessmentCampaignPage';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/assessment.queries', () => ({
  MY_CAMPAIGNS_QUERY: 'MY_CAMPAIGNS_QUERY',
  CREATE_CAMPAIGN_MUTATION: 'CREATE_CAMPAIGN_MUTATION',
  ACTIVATE_CAMPAIGN_MUTATION: 'ACTIVATE_CAMPAIGN_MUTATION',
  COMPLETE_CAMPAIGN_MUTATION: 'COMPLETE_CAMPAIGN_MUTATION',
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Always render Dialog children so we can test the form without Radix portals
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog">{children}</div>
  ),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

const mockCreateCampaign = vi.fn();
const mockActivate = vi.fn();
const mockComplete = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(urql.useQuery).mockReturnValue([
    { data: undefined, fetching: false, error: undefined },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation)
    .mockReturnValueOnce([
      { fetching: false } as never,
      mockCreateCampaign as never,
    ])
    .mockReturnValueOnce([{} as never, mockActivate as never])
    .mockReturnValueOnce([{} as never, mockComplete as never]);
  mockCreateCampaign.mockResolvedValue({ error: undefined });
  mockActivate.mockResolvedValue({ error: undefined });
  mockComplete.mockResolvedValue({ error: undefined });
});

const MOCK_CAMPAIGNS = [
  {
    id: 'c1',
    title: 'Q1 Review',
    targetUserId: 'u1',
    status: 'DRAFT',
    dueDate: null,
    criteriaCount: 5,
  },
  {
    id: 'c2',
    title: 'Mid-Year Assessment',
    targetUserId: 'u2',
    status: 'ACTIVE',
    dueDate: '2026-06-30T00:00:00Z',
    criteriaCount: 8,
  },
  {
    id: 'c3',
    title: 'Annual Review',
    targetUserId: 'u3',
    status: 'COMPLETED',
    dueDate: null,
    criteriaCount: 10,
  },
];

describe('AssessmentCampaignPage', () => {
  it('renders the 360 Assessment Campaigns heading', () => {
    render(<AssessmentCampaignPage />);
    expect(
      screen.getByRole('heading', { name: /360 assessment campaigns/i })
    ).toBeInTheDocument();
  });

  it('renders the "New Campaign" button', () => {
    render(<AssessmentCampaignPage />);
    expect(
      screen.getByRole('button', { name: /new campaign/i })
    ).toBeInTheDocument();
  });

  it('shows empty state message when no campaigns', () => {
    render(<AssessmentCampaignPage />);
    expect(
      screen.getByText(/no campaigns yet/i)
    ).toBeInTheDocument();
  });

  it('shows loading indicator when fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
      vi.fn(),
    ] as never);
    render(<AssessmentCampaignPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders campaign rows when data is available', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myCampaigns: MOCK_CAMPAIGNS }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<AssessmentCampaignPage />);
    expect(screen.getByText('Q1 Review')).toBeInTheDocument();
    expect(screen.getByText('Mid-Year Assessment')).toBeInTheDocument();
    expect(screen.getByText('Annual Review')).toBeInTheDocument();
  });

  it('shows "Activate" button for DRAFT campaigns', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myCampaigns: MOCK_CAMPAIGNS }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<AssessmentCampaignPage />);
    expect(
      screen.getByRole('button', { name: 'Activate' })
    ).toBeInTheDocument();
  });

  it('shows "Close & Generate" button for ACTIVE campaigns', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myCampaigns: MOCK_CAMPAIGNS }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<AssessmentCampaignPage />);
    expect(
      screen.getByRole('button', { name: /close & generate/i })
    ).toBeInTheDocument();
  });

  it('calls activate mutation when Activate button is clicked', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myCampaigns: MOCK_CAMPAIGNS }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<AssessmentCampaignPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Activate' }));
    expect(mockActivate).toHaveBeenCalledWith({ campaignId: 'c1' });
  });

  it('calls complete mutation when "Close & Generate" is clicked', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myCampaigns: MOCK_CAMPAIGNS }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<AssessmentCampaignPage />);
    fireEvent.click(screen.getByRole('button', { name: /close & generate/i }));
    expect(mockComplete).toHaveBeenCalledWith({ campaignId: 'c2' });
  });

  it('renders dialog with form fields', () => {
    render(<AssessmentCampaignPage />);
    expect(
      screen.getByText('Create Assessment Campaign')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Q1 Performance Review')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('uuid-of-user')
    ).toBeInTheDocument();
  });
});
