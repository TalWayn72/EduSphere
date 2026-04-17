/**
 * Unit tests for TrackChangesReview.
 *
 * Tests: document rendering, bulk accept/reject, approve button state,
 * pending count display, RTL document.
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
      const opDef = doc?.definitions?.find(
        (d) => d.kind === 'OperationDefinition'
      );
      const opName = opDef?.name?.value ?? '';
      if (opName === 'DecidePolishedChangeAccept')
        return [{ fetching: false }, mockAcceptChange];
      if (opName === 'DecidePolishedChangeReject')
        return [{ fetching: false }, mockRejectChange];
      if (opName === 'BulkAcceptPolishedChanges')
        return [{ fetching: false }, mockAcceptAll];
      if (opName === 'BulkRejectPolishedChanges')
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

vi.mock('@/components/polished-transcript/ChangeInlineMarker', () => ({
  ChangeInlineMarker: ({
    change,
    onAccept,
    onReject,
  }: {
    change: { id: string; originalFragment: string; replacementFragment: string };
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
  }) => (
    <span data-testid={`change-${change.id}`}>
      <del>{change.originalFragment}</del>
      <ins>{change.replacementFragment}</ins>
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

// ── Fixtures — using new PolishedTranscript type with blocks[] ────────────────

const TRANSCRIPT: PolishedTranscript = {
  id: 'pt-1',
  lessonId: 'les-1',
  version: 1,
  status: 'DRAFT',
  fullText: 'שלום לכולם',
  coverageScore: 0.95,
  polishedBy: 'ai-model-v1',
  approvedAt: null,
  blocks: [
    {
      id: 'blk-1',
      polishedId: 'pt-1',
      blockType: 'POLISHED_TEXT',
      blockOrder: 1,
      content: 'אמממ שלום לכולם',
      originalText: 'אמממ שלום לכולם',
      startTime: 0,
      endTime: 10,
      sourceSegmentIds: [],
      instructorEdited: false,
      instructorText: null,
      changes: [
        {
          id: 'c1',
          blockId: 'blk-1',
          changeType: 'FILLER_REMOVED',
          originalFragment: 'אמממ ',
          replacementFragment: '',
          charOffsetStart: 0,
          charOffsetEnd: 5,
          status: 'PENDING',
          reviewedAt: null,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TrackChangesReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockDecisions)) {
      delete mockDecisions[key];
    }
  });

  it('renders track-changes-review container', () => {
    render(<TrackChangesReview transcript={TRANSCRIPT} />);
    expect(screen.getByTestId('track-changes-review')).toBeInTheDocument();
  });

  it('renders the polished document area', () => {
    render(<TrackChangesReview transcript={TRANSCRIPT} />);
    expect(screen.getByTestId('polished-document')).toBeInTheDocument();
  });

  it('renders Accept All and Reject All buttons', () => {
    render(<TrackChangesReview transcript={TRANSCRIPT} />);
    expect(screen.getByTestId('accept-all-btn')).toBeInTheDocument();
    expect(screen.getByTestId('reject-all-btn')).toBeInTheDocument();
  });

  it('shows pending change count in toolbar', () => {
    render(<TrackChangesReview transcript={TRANSCRIPT} />);
    expect(screen.getByText('1 changes pending')).toBeInTheDocument();
  });

  it('approve button is disabled when pending changes exist', () => {
    render(<TrackChangesReview transcript={TRANSCRIPT} />);
    expect(screen.getByTestId('approve-transcript-btn')).toBeDisabled();
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

  it('renders with no blocks without crashing', () => {
    const emptyTranscript: PolishedTranscript = {
      ...TRANSCRIPT,
      blocks: [],
    };
    render(<TrackChangesReview transcript={emptyTranscript} />);
    expect(screen.getByTestId('track-changes-review')).toBeInTheDocument();
  });

  it('approve button is enabled when no pending changes', () => {
    const approvedTranscript: PolishedTranscript = {
      ...TRANSCRIPT,
      blocks: [
        {
          ...TRANSCRIPT.blocks[0]!,
          changes: [
            {
              ...TRANSCRIPT.blocks[0]!.changes[0]!,
              status: 'ACCEPTED',
            },
          ],
        },
      ],
    };
    render(<TrackChangesReview transcript={approvedTranscript} />);
    expect(screen.getByTestId('approve-transcript-btn')).not.toBeDisabled();
  });
});
