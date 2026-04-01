import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';

describe('Avatar', () => {
  it('renders a span element', () => {
    render(<Avatar data-testid="avatar" />);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('forwards className', () => {
    render(<Avatar className="h-12 w-12" data-testid="avatar" />);
    expect(screen.getByTestId('avatar')).toHaveClass('h-12', 'w-12');
  });

  it('has correct displayName', () => {
    expect(Avatar.displayName).toBe('Avatar');
  });
});

describe('AvatarFallback', () => {
  it('renders fallback text', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('forwards className', () => {
    render(
      <Avatar>
        <AvatarFallback className="bg-blue-500" data-testid="fb">
          J
        </AvatarFallback>
      </Avatar>
    );
    expect(screen.getByTestId('fb')).toHaveClass('bg-blue-500');
  });

  it('has correct displayName', () => {
    expect(AvatarFallback.displayName).toBe('AvatarFallback');
  });
});

describe('AvatarImage', () => {
  // Note: Radix AvatarImage does NOT render the <img> in jsdom because
  // the onLoad event never fires. We can only test the displayName and
  // that the component doesn't crash when rendered.

  it('renders without crashing', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="/avatar.png" alt="User" />
      </Avatar>
    );
    // The Avatar span is rendered even though the img inside is hidden
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('has correct displayName', () => {
    expect(AvatarImage.displayName).toBe('AvatarImage');
  });
});
