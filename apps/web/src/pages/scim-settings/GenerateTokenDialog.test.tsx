import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GenerateTokenDialog } from './GenerateTokenDialog';

// ── shadcn dialog mock ────────────────────────────────────────────────────────
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange?: (v: boolean) => void;
    children: React.ReactNode;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="dialog-content" {...props}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p {...props}>{children}</p>
  ),
  DialogFooter: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="dialog-footer" {...props}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

// ── helpers ───────────────────────────────────────────────────────────────────
const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  description: '',
  onDescriptionChange: vi.fn(),
  expiresInDays: '',
  onExpiresInDaysChange: vi.fn(),
  generatedToken: null as string | null,
  onGenerate: vi.fn(),
  onDone: vi.fn(),
};

function renderDialog(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<GenerateTokenDialog {...props} />);
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe('GenerateTokenDialog — closed state', () => {
  it('renders nothing when open is false', () => {
    renderDialog({ open: false });
    expect(screen.queryByTestId('dialog')).toBeNull();
  });
});

describe('GenerateTokenDialog — form view (no token)', () => {
  it('renders title', () => {
    renderDialog();
    expect(screen.getByText('Generate SCIM Token')).toBeTruthy();
  });

  it('renders description input with placeholder', () => {
    renderDialog();
    const input = screen.getByPlaceholderText('e.g. Workday Production');
    expect(input).toBeTruthy();
  });

  it('renders expires input with placeholder', () => {
    renderDialog();
    const input = screen.getByPlaceholderText('e.g. 365');
    expect(input).toBeTruthy();
  });

  it('disables Generate button when description is empty', () => {
    renderDialog({ description: '' });
    const btn = screen.getByText('Generate');
    expect(btn.closest('button')?.disabled).toBe(true);
  });

  it('disables Generate button when description is whitespace', () => {
    renderDialog({ description: '   ' });
    const btn = screen.getByText('Generate');
    expect(btn.closest('button')?.disabled).toBe(true);
  });

  it('enables Generate button when description has text', () => {
    renderDialog({ description: 'Workday Prod' });
    const btn = screen.getByText('Generate');
    expect(btn.closest('button')?.disabled).toBe(false);
  });

  it('calls onDescriptionChange when typing description', () => {
    const onDescriptionChange = vi.fn();
    renderDialog({ onDescriptionChange });
    fireEvent.change(screen.getByPlaceholderText('e.g. Workday Production'), {
      target: { value: 'My Token' },
    });
    expect(onDescriptionChange).toHaveBeenCalledWith('My Token');
  });

  it('calls onExpiresInDaysChange when typing expiry', () => {
    const onExpiresInDaysChange = vi.fn();
    renderDialog({ onExpiresInDaysChange });
    fireEvent.change(screen.getByPlaceholderText('e.g. 365'), {
      target: { value: '90' },
    });
    expect(onExpiresInDaysChange).toHaveBeenCalledWith('90');
  });

  it('calls onGenerate when Generate button is clicked', () => {
    const onGenerate = vi.fn();
    renderDialog({ description: 'Valid', onGenerate });
    fireEvent.click(screen.getByText('Generate'));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange(false) when Cancel clicked', () => {
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders Cancel and Generate buttons', () => {
    renderDialog();
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Generate')).toBeTruthy();
  });
});

describe('GenerateTokenDialog — token display view', () => {
  const token = 'scim_abc123_very_long_token_value';

  it('shows the generated token text', () => {
    renderDialog({ generatedToken: token });
    expect(screen.getByText(token)).toBeTruthy();
  });

  it('shows a warning about saving the token', () => {
    renderDialog({ generatedToken: token });
    expect(
      screen.getByText('Save this token - it will not be shown again.')
    ).toBeTruthy();
  });

  it('shows Done button instead of Generate/Cancel', () => {
    renderDialog({ generatedToken: token });
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.queryByText('Generate')).toBeNull();
    expect(screen.queryByText('Cancel')).toBeNull();
  });

  it('calls onDone when Done button clicked', () => {
    const onDone = vi.fn();
    renderDialog({ generatedToken: token, onDone });
    fireEvent.click(screen.getByText('Done'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not show description input after token is generated', () => {
    renderDialog({ generatedToken: token });
    expect(screen.queryByPlaceholderText('e.g. Workday Production')).toBeNull();
  });
});
