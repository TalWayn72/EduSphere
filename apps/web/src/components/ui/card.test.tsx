import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';

describe('Card', () => {
  it('renders a div', () => {
    render(<Card data-testid="card">Content</Card>);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('forwards className', () => {
    render(
      <Card className="mt-4" data-testid="card">
        Content
      </Card>
    );
    expect(screen.getByTestId('card')).toHaveClass('mt-4');
  });

  it('renders children', () => {
    render(<Card>Hello Card</Card>);
    expect(screen.getByText('Hello Card')).toBeInTheDocument();
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref}>Ref</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('has correct displayName', () => {
    expect(Card.displayName).toBe('Card');
  });
});

describe('CardHeader', () => {
  it('renders and forwards className', () => {
    render(
      <CardHeader className="mt-2" data-testid="header">
        Header
      </CardHeader>
    );
    const el = screen.getByTestId('header');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('mt-2');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardHeader ref={ref}>H</CardHeader>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('has correct displayName', () => {
    expect(CardHeader.displayName).toBe('CardHeader');
  });
});

describe('CardTitle', () => {
  it('renders an h3 element', () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByText('Title').tagName).toBe('H3');
  });

  it('forwards className', () => {
    render(
      <CardTitle className="text-xl" data-testid="title">
        T
      </CardTitle>
    );
    expect(screen.getByTestId('title')).toHaveClass('text-xl');
  });

  it('has correct displayName', () => {
    expect(CardTitle.displayName).toBe('CardTitle');
  });
});

describe('CardDescription', () => {
  it('renders a p element', () => {
    render(<CardDescription>Desc</CardDescription>);
    expect(screen.getByText('Desc').tagName).toBe('P');
  });

  it('forwards className', () => {
    render(
      <CardDescription className="italic" data-testid="desc">
        D
      </CardDescription>
    );
    expect(screen.getByTestId('desc')).toHaveClass('italic');
  });

  it('has correct displayName', () => {
    expect(CardDescription.displayName).toBe('CardDescription');
  });
});

describe('CardContent', () => {
  it('renders and forwards className', () => {
    render(
      <CardContent className="px-2" data-testid="content">
        Body
      </CardContent>
    );
    const el = screen.getByTestId('content');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('px-2');
  });

  it('has correct displayName', () => {
    expect(CardContent.displayName).toBe('CardContent');
  });
});

describe('CardFooter', () => {
  it('renders and forwards className', () => {
    render(
      <CardFooter className="mt-1" data-testid="footer">
        Foot
      </CardFooter>
    );
    const el = screen.getByTestId('footer');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('mt-1');
  });

  it('has correct displayName', () => {
    expect(CardFooter.displayName).toBe('CardFooter');
  });
});
