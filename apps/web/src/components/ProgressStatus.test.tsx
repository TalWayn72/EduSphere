// @vitest-environment jsdom
/**
 * ProgressStatus component tests
 *
 * Verifies:
 *  1. Renders with inline variant (spinner + text in row)
 *  2. Renders with block variant (vertical layout)
 *  3. Renders with minimal variant (text only, no spinner)
 *  4. Has role="status" and aria-live="polite" attributes
 *  5. Does not render when active is false
 *  6. Shows spinner when showSpinner is true (default for inline/block)
 *  7. Hides spinner when showSpinner is false
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressStatus } from './ProgressStatus';

// react-i18next is mocked globally in src/test/setup.ts
// t(key) returns the key itself as fallback so we can assert on key strings

// lucide-react Loader2 renders an <svg> — we identify the spinner by its aria-hidden attr
const MESSAGES = ['progress.step.one', 'progress.step.two'];

describe('ProgressStatus', () => {
  it('renders with inline variant: spinner and text in a row', () => {
    const { container } = render(
      <ProgressStatus messages={MESSAGES} active={true} variant="inline" />,
    );

    // Outer wrapper is a flex span (inline — uses span to work inside <button>)
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.tagName).toBe('SPAN');
    expect(wrapper.className).toContain('inline-flex');

    // Spinner svg present (aria-hidden="true")
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('renders with block variant: vertical column layout', () => {
    const { container } = render(
      <ProgressStatus messages={MESSAGES} active={true} variant="block" />,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex-col');

    // Spinner present in block variant by default
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('renders with minimal variant: text only, no spinner', () => {
    const { container } = render(
      <ProgressStatus messages={MESSAGES} active={true} variant="minimal" />,
    );

    // No spinner svg in minimal variant
    expect(container.querySelector('svg')).not.toBeInTheDocument();

    // Status text still present
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has role="status" and aria-live="polite" on the text span', () => {
    render(<ProgressStatus messages={MESSAGES} active={true} />);

    const statusEl = screen.getByRole('status');
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toHaveAttribute('aria-live', 'polite');
  });

  it('does not render anything when active is false', () => {
    const { container } = render(
      <ProgressStatus messages={MESSAGES} active={false} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows spinner when showSpinner is true for inline variant', () => {
    const { container } = render(
      <ProgressStatus messages={MESSAGES} active={true} variant="inline" showSpinner={true} />,
    );

    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('hides spinner when showSpinner is false', () => {
    const { container } = render(
      <ProgressStatus messages={MESSAGES} active={true} variant="inline" showSpinner={false} />,
    );

    expect(container.querySelector('svg')).not.toBeInTheDocument();
    // Text is still rendered
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('does not render when messages array is empty', () => {
    const { container } = render(
      <ProgressStatus messages={[]} active={true} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
