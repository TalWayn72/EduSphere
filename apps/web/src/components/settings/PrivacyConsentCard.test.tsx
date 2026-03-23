import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrivacyConsentCard } from './PrivacyConsentCard';

vi.mock('urql', () => ({
  useMutation: vi.fn(() => [{}, vi.fn().mockResolvedValue({ data: {}, error: undefined })]),
  gql: (strings: TemplateStringsArray, ...values: unknown[]) => strings.join(''),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'privacy.title': 'Privacy & AI',
        'privacy.description': 'Manage how your data is used',
        'privacy.aiProcessing': 'AI Processing',
        'privacy.aiProcessingDesc': 'Allow AI for learning',
        'privacy.thirdPartyLlm': 'Third-Party AI Providers',
        'privacy.thirdPartyLlmDesc': 'Allow sending data to external AI',
        'privacy.saved': 'Privacy preference saved',
        'privacy.tooltip': 'Enable this to unlock AI features',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const defaultHighlight = {
  highlightId: null,
  targetRef: vi.fn(),
  isHighlighted: false,
  highlightClass: '',
};

describe('PrivacyConsentCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders card title and description', () => {
    render(<PrivacyConsentCard highlight={defaultHighlight} />);
    expect(screen.getByText('Privacy & AI')).toBeInTheDocument();
    expect(screen.getByText('Manage how your data is used')).toBeInTheDocument();
  });

  it('renders both toggle rows', () => {
    render(<PrivacyConsentCard highlight={defaultHighlight} />);
    expect(screen.getByText('AI Processing')).toBeInTheDocument();
    expect(screen.getByText('Third-Party AI Providers')).toBeInTheDocument();
  });

  it('reads initial state from localStorage', () => {
    localStorage.setItem('edusphere_consent_AI_PROCESSING', 'true');
    render(<PrivacyConsentCard highlight={defaultHighlight} />);
    const switches = screen.getAllByRole('switch');
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');
    expect(switches[1]).toHaveAttribute('aria-checked', 'false');
  });

  it('updates localStorage on toggle', () => {
    render(<PrivacyConsentCard highlight={defaultHighlight} />);
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]!);
    expect(localStorage.getItem('edusphere_consent_AI_PROCESSING')).toBe('true');
  });

  it('applies highlight class when targeted', () => {
    const highlight = {
      ...defaultHighlight,
      highlightId: 'ai-consent',
      isHighlighted: true,
      highlightClass: 'animate-settings-highlight',
    };
    render(<PrivacyConsentCard highlight={highlight} />);
    const aiRow = document.getElementById('setting-ai-consent');
    expect(aiRow?.className).toContain('animate-settings-highlight');
  });

  it('calls targetRef for highlighted element', () => {
    const targetRef = vi.fn();
    const highlight = {
      ...defaultHighlight,
      highlightId: 'ai-consent',
      targetRef,
    };
    render(<PrivacyConsentCard highlight={highlight} />);
    expect(targetRef).toHaveBeenCalled();
  });

  it('does not highlight non-targeted toggles', () => {
    const highlight = {
      ...defaultHighlight,
      highlightId: 'third-party-llm',
      isHighlighted: true,
      highlightClass: 'animate-settings-highlight',
    };
    render(<PrivacyConsentCard highlight={highlight} />);
    const aiRow = document.getElementById('setting-ai-consent');
    expect(aiRow?.className).not.toContain('animate-settings-highlight');
    const llmRow = document.getElementById('setting-third-party-llm');
    expect(llmRow?.className).toContain('animate-settings-highlight');
  });
});
