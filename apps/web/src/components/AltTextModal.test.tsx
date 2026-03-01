import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AltTextModal } from './AltTextModal';

// AltTextModal uses urqlClient directly (not urql hooks), so mock the client module
vi.mock('@/lib/urql-client', () => ({
  urqlClient: {
    mutation: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

vi.mock('@/lib/graphql/content-tier3.queries', () => ({
  UPDATE_MEDIA_ALT_TEXT_MUTATION: 'UPDATE_MEDIA_ALT_TEXT_MUTATION',
}));

import { urqlClient } from '@/lib/urql-client';

const defaultProps = {
  mediaId: 'media-123',
  initialAltText: 'A photo of a sunset',
  open: true,
  onClose: vi.fn(),
  onSaved: vi.fn(),
};

function renderModal(props = defaultProps) {
  return render(<AltTextModal {...props} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(urqlClient.mutation).mockReturnValue({
    toPromise: vi.fn().mockResolvedValue({ error: undefined }),
  } as never);
});

describe('AltTextModal', () => {
  it('renders the dialog title', () => {
    renderModal();
    expect(
      screen.getByText('Review AI-Generated Alt-Text')
    ).toBeInTheDocument();
  });

  it('renders description paragraph', () => {
    renderModal();
    expect(
      screen.getByText(/ai has generated a description/i)
    ).toBeInTheDocument();
  });

  it('pre-fills textarea with initialAltText', () => {
    renderModal();
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('A photo of a sunset');
  });

  it('shows character counter (125 - initialAltText.length)', () => {
    renderModal();
    const remaining = 125 - 'A photo of a sunset'.length;
    expect(
      screen.getByText(new RegExp(`${remaining} characters remaining`))
    ).toBeInTheDocument();
  });

  it('Save Alt-Text button is disabled when textarea is empty', () => {
    renderModal({ ...defaultProps, initialAltText: null as unknown as string });
    const btn = screen.getByRole('button', { name: /save alt-text/i });
    expect(btn).toBeDisabled();
  });

  it('Cancel button calls onClose', () => {
    const onClose = vi.fn();
    renderModal({ ...defaultProps, onClose });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables Save button and shows no alert when text is whitespace-only', () => {
    // The button itself is disabled when value.trim() is empty,
    // preventing invalid submissions at the UI level.
    renderModal({ ...defaultProps, initialAltText: 'some text' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: /save alt-text/i })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls onSaved and onClose on successful save', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    renderModal({ ...defaultProps, onSaved, onClose });
    fireEvent.click(screen.getByRole('button', { name: /save alt-text/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('A photo of a sunset'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows error message when mutation fails', async () => {
    vi.mocked(urqlClient.mutation).mockReturnValue({
      toPromise: vi.fn().mockResolvedValue({
        error: { message: 'Network error' },
      }),
    } as never);
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /save alt-text/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/network error/i)
    );
  });

  it('resets value when modal re-opens with new initialAltText', () => {
    const { rerender } = render(
      <AltTextModal {...defaultProps} open={false} />
    );
    rerender(
      <AltTextModal
        {...defaultProps}
        open={true}
        initialAltText="New description"
      />
    );
    expect(screen.getByRole('textbox')).toHaveValue('New description');
  });
});
