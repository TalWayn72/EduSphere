/**
 * Unit tests for TrackChangesReview.
 *
 * Tests: document rendering, bulk accept/reject, approve button state,
 * pending count display, voice profile sidebar visibility, RTL document.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PolishedTranscript } from './polished-transcript.types';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'polishedTranscript.acceptAll': 'Accept All',
        'polishedTranscript.rejectAll': 'Reject All',
        'polishedTranscript.approve': 'Approve Transcript',
        'polishedTranscript.pendingCount': `${opts?.count ?? 0} changes pending`,
        'polishedTranscript.acceptChange': 'Accept this change',
        'polishedTranscript.rejectChange': 'Reject this change',
        'polishedTranscript.status.draft': 'Draft',
        'polishedTranscript.processing': `AI polishing... ${opts?.progress ?? 0}%`,
        'polishedTranscript.voiceProfile.title': 'Voice Profile',
        'polishedTranscript.voiceProfile.formality': 'Formality',
        'polishedTranscript.voiceProfile.avgWords': `Avg. ${opts?.count ?? 0} words/sentence`,
        'polishedTranscript.voiceProfile.topPhrases': 'Characteristic phrases',
      };
      return map[key] ?? key;
    },
  }),
}));

const mockAcceptChange = vi.fn().mockResolvedValue({ data: {} });
const mockRejectChange = vi.fn().mockResolvedValue({ data: {} });
const mockAcceptAll = vi.fn().mockResolvedValue({ data: {} });
const mockRejectAll = vi.fn().mockResolvedValue({ data: {} });
const mockApprove = vi.fn().mockResolvedValue({ data: {} });

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof import('urql')>();
  return {
    ...actual,
    useMutation: (doc: {
      definitions?: Array<{ kind: string; name?: { value: string } }>;
    }) => {
      // Find the OperationDefinition (not fragment definitions)
      const opDef = doc?.definitions?.find(
        (d) => d.kind === 'OperationDefinition'
      );
      const opName = opDef?.name?.value ?? '';
      if (opName === 'AcceptPolishingChange')
        return [{ fetching: false }, mockAcceptChange];
      if (opName === 'RejectPolishingChange')
        return [{ fetching: false }, mockRejectChange];
      if (opName === 'AcceptAllPolishingChanges')
        return [{ fetching: false }, mockAcceptAll];
      if (opName === 'RejectAllPolishingChanges')
        return [{ fetching: false }, mockRejectAll];
      if (opName === 'ApprovePolishedTranscript')
        return [{ fetching: false }, mockApprove];
      return [{ fetching: false }, vi.fn()];
    },
  };
});

const mockSetDecision = vi.fn();
const mockAcceptAllStore = vi.fn();
const mockRejectAllStore = vi.fn();
const mockDecisions: Record<string, string> = {};

vi.mock('@/components/polished-transcript/useTrackChangesStore', () => ({
  useTrackChangesStore: () => ({
    decisions: mockDecisions,
    setDecision: mockSetDecision,
    acceptAll: mockAcceptAllStore,
    rejectAll: mockRejectAllStore,
  }),
}));

vi.mock('@/components/polished-transcript/VoiceProfileCard', () => ({
  VoiceProfileCard: ({
    voiceProfile,
  }: {
    voiceProfile: { displayName: string };
  }) => <div data-testid="voice-profile-card">{voiceProfile.displayName}</div>,
}));

vi.mock('@/components/polished-transcript/ChangeInlineMarker', () => ({
  ChangeInlineMarker: ({
    change,
    onAccept,
    onReject,
  }: {
    change: { id: string; originalText: string; replacementText: string };
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
  }) => (
    <span data-testid={`change-${change.id}`}>
      <del>{change.originalText}</del>
      <ins>{change.replacementText}</ins>
      <button
        data-testid={`accept-${change.id}`}
        onClick={() => onAccept(change.id)}
      >
        Accept
      </button>
      <button
        data-testid={`reject-${change.id}`}
        onClick={() => onReject(change.id)}
      >
        Reject
      </button>
    </span>
  ),
}));

vi.mock('@/components/polished-transcript/PolishingStatusBadge', () => ({
  PolishingStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    'data-testid': testId,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
    'data-testid'?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-testid={testId}>
      {children}
    </button>
  ),
}));

vi.mock('lucide-react', () => ({
  CheckCheck: () => <svg />,
  XCircle: () => <svg />,
}));

import { TrackChangesReview } from './TrackChangesReview';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TRANSCRIPT: PolishedTranscript = {
  id: 'pt-1',
  lessonId: 'les-1',
  rawText: 'אמממ שלום לכולם',
  polishedText: 'שלום לכולם',
  status: 'DRAFT',
  changes: [
    {
      id: 'c1',
      changeType: 'FILLER_REMOVED',
      originalText: 'אמממ ',
      replacementText: '',
      charOffsetStart: 0,
      charOffsetEnd: 5,
      decision: 'PENDING',
    },
  ],
  voiceProfile: {
    id: 'vp-1',
    instructorId: 'usr-1',
    displayName: 'Rabbi Cohen',
    avgWordsPerSentence: 12,
    formalityScore: 75,
    topPhrases: ['כמו שאמרנו', 'לכן'],
    lastUpdatedAt: '2026-01-01T00:00:00Z',
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TrackChangesReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset optimistic decisions so pendingCount is fresh for each test
    for (const key of Object.keys(mockDecisions)) {
      delete mockDecisions[key];
    }
  });

  it('renders the polished document area', () => {
    render(<TrackChangesReview transcript={TRANSCRIPT} />);
    expect(screen.getByTestId('polished-document')).toBeInTheDocument();
  });

  it('sets dir=rtl on the document', () => {
    render(<TrackChangesReview transcript={TRANSCRIPT} />);
    expect(screen.getByTestId('polished-document')).toHaveAttribute(
      'dir',
      'rtl'
    );
  });

  it('shows pending change count in toolbar', () => {
    render(<TrackChangesReview transcript={TRANSCRIPT} />);
    expect(screen.getByText('1 changes pending')).toBeInTheDocument();
  });

  it('renders Accept All and Reject All buttons', () => {
    render(<TrackChangesReview transcript={TRANSCRIPT} />);
    expect(screen.getByTestId('accept-all-btn')).toBeInTheDocument();
    expect(screen.getByTestId('reject-all-btn')).toBeInTheDocument();
  });

  it('approve button is disabled when pending changes exist', () => {
    render(<TrackChangesReview transcript={TRANSCRIPT} />);
    expect(screen.getByTestId('approve-transcript-btn')).toBeDisabled();
  });

  it('renders voice profile sidebar when voiceProfile present', () => {
    render(<TrackChangesReview transcript={TRANSCRIPT} />);
    expect(screen.getByTestId('voice-profile-card')).toBeInTheDocument();
    expect(screen.getByText('Rabbi Cohen')).toBeInTheDocument();
  });

  it('does not render voice profile when voiceProfile is null', () => {
    const noProfile = { ...TRANSCRIPT, voiceProfile: null };
    render(<TrackChangesReview transcript={noProfile} />);
    expect(screen.queryByTestId('voice-profile-card')).not.toBeInTheDocument();
  });

  it('calls accept mutation when accept button clicked', async () => {
    const user = userEvent.setup();
    render(<TrackChangesReview transcript={TRANSCRIPT} />);
    await user.click(screen.getByTestId('accept-c1'));
    expect(mockAcceptChange).toHaveBeenCalledWith({ changeId: 'c1' });
  });

  it('calls reject mutation when reject button clicked', async () => {
    const user = userEvent.setup();
    render(<TrackChangesReview transcript={TRANSCRIPT} />);
    await user.click(screen.getByTestId('reject-c1'));
    expect(mockRejectChange).toHaveBeenCalledWith({ changeId: 'c1' });
  });

  it('calls acceptAllMutation when Accept All clicked', async () => {
    const user = userEvent.setup();
    render(<TrackChangesReview transcript={TRANSCRIPT} />);
    await user.click(screen.getByTestId('accept-all-btn'));
    expect(mockAcceptAll).toHaveBeenCalledWith({ transcriptId: 'pt-1' });
  });

  it('renders track-changes-review container', () => {
    render(<TrackChangesReview transcript={TRANSCRIPT} />);
    expect(screen.getByTestId('track-changes-review')).toBeInTheDocument();
  });
});
