import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MasteryBadge } from './MasteryBadge';

describe('MasteryBadge', () => {
  const levels = ['none', 'attempted', 'familiar', 'proficient', 'mastered'] as const;

  describe('renders all 5 mastery levels', () => {
    it.each(levels)('renders level "%s" without error', (level) => {
      render(<MasteryBadge level={level} />);
      expect(screen.getByTestId(`mastery-badge-${level}`)).toBeInTheDocument();
    });
  });

  describe('shows correct label', () => {
    it('shows "Not Started" for none', () => {
      render(<MasteryBadge level="none" />);
      expect(screen.getByText('Not Started')).toBeInTheDocument();
    });

    it('shows "Attempted" for attempted', () => {
      render(<MasteryBadge level="attempted" />);
      expect(screen.getByText('Attempted')).toBeInTheDocument();
    });

    it('shows "Familiar" for familiar', () => {
      render(<MasteryBadge level="familiar" />);
      expect(screen.getByText('Familiar')).toBeInTheDocument();
    });

    it('shows "Proficient" for proficient', () => {
      render(<MasteryBadge level="proficient" />);
      expect(screen.getByText('Proficient')).toBeInTheDocument();
    });

    it('shows "Mastered" for mastered', () => {
      render(<MasteryBadge level="mastered" />);
      expect(screen.getByText('Mastered')).toBeInTheDocument();
    });
  });

  describe('showLabel prop', () => {
    it('hides label when showLabel=false', () => {
      render(<MasteryBadge level="proficient" showLabel={false} />);
      expect(screen.queryByText('Proficient')).not.toBeInTheDocument();
    });

    it('shows label by default (showLabel=true)', () => {
      render(<MasteryBadge level="mastered" />);
      expect(screen.getByText('Mastered')).toBeInTheDocument();
    });
  });

  describe('applies correct data-testid', () => {
    it.each(levels)('sets data-testid="mastery-badge-%s"', (level) => {
      render(<MasteryBadge level={level} />);
      expect(screen.getByTestId(`mastery-badge-${level}`)).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('applies sm size classes', () => {
      render(<MasteryBadge level="none" size="sm" />);
      const badge = screen.getByTestId('mastery-badge-none');
      expect(badge.className).toContain('px-2');
      expect(badge.className).toContain('py-0.5');
    });

    it('applies md size classes by default', () => {
      render(<MasteryBadge level="none" />);
      const badge = screen.getByTestId('mastery-badge-none');
      expect(badge.className).toContain('px-2.5');
      expect(badge.className).toContain('py-1');
    });

    it('applies md size classes explicitly', () => {
      render(<MasteryBadge level="mastered" size="md" />);
      const badge = screen.getByTestId('mastery-badge-mastered');
      expect(badge.className).toContain('px-2.5');
      expect(badge.className).toContain('py-1');
    });
  });

  describe('mastery level CSS class', () => {
    it.each(levels)('applies mastery-%s class', (level) => {
      render(<MasteryBadge level={level} />);
      const badge = screen.getByTestId(`mastery-badge-${level}`);
      expect(badge.className).toContain(`mastery-${level}`);
    });
  });

  describe('custom className', () => {
    it('merges custom className with defaults', () => {
      render(<MasteryBadge level="mastered" className="custom-class" />);
      const badge = screen.getByTestId('mastery-badge-mastered');
      expect(badge.className).toContain('custom-class');
      expect(badge.className).toContain('mastery-mastered');
    });
  });

  describe('dot indicator', () => {
    it('renders the dot indicator span', () => {
      render(<MasteryBadge level="proficient" />);
      const badge = screen.getByTestId('mastery-badge-proficient');
      const dot = badge.querySelector('[aria-hidden]');
      expect(dot).toBeInTheDocument();
      expect(dot?.className).toContain('rounded-full');
    });
  });
});
