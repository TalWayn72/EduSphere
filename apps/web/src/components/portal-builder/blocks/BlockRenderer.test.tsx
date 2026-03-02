import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BlockRenderer } from './BlockRenderer';
import type { PortalBlock } from '../types';

function makeBlock(
  type: PortalBlock['type'],
  config: Record<string, unknown> = {}
): PortalBlock {
  return { id: 'b1', type, order: 0, config };
}

describe('BlockRenderer', () => {
  describe('HeroBanner', () => {
    it('renders default title when no config', () => {
      render(<BlockRenderer block={makeBlock('HeroBanner')} />);
      expect(
        screen.getByText('Welcome to Your Learning Portal')
      ).toBeInTheDocument();
    });

    it('renders custom title from config', () => {
      render(
        <BlockRenderer
          block={makeBlock('HeroBanner', { title: 'My Custom Portal' })}
        />
      );
      expect(screen.getByText('My Custom Portal')).toBeInTheDocument();
    });

    it('renders default CTA button text', () => {
      render(<BlockRenderer block={makeBlock('HeroBanner')} />);
      expect(screen.getByText('Get Started')).toBeInTheDocument();
    });
  });

  describe('FeaturedCourses', () => {
    it('renders default "Featured Courses" heading', () => {
      render(<BlockRenderer block={makeBlock('FeaturedCourses')} />);
      expect(screen.getByText('Featured Courses')).toBeInTheDocument();
    });

    it('renders 3 course placeholder cards', () => {
      render(<BlockRenderer block={makeBlock('FeaturedCourses')} />);
      expect(screen.getByText('Course 1')).toBeInTheDocument();
      expect(screen.getByText('Course 2')).toBeInTheDocument();
      expect(screen.getByText('Course 3')).toBeInTheDocument();
    });
  });

  describe('StatWidget', () => {
    it('renders stat labels', () => {
      render(<BlockRenderer block={makeBlock('StatWidget')} />);
      expect(screen.getByText('Completions')).toBeInTheDocument();
      expect(screen.getByText('Learners')).toBeInTheDocument();
      expect(screen.getByText('Courses')).toBeInTheDocument();
    });
  });

  describe('TextBlock', () => {
    it('renders default placeholder text', () => {
      render(<BlockRenderer block={makeBlock('TextBlock')} />);
      expect(
        screen.getByText('Add your text content here...')
      ).toBeInTheDocument();
    });

    it('renders custom content from config', () => {
      render(
        <BlockRenderer
          block={makeBlock('TextBlock', { content: 'Hello world' })}
        />
      );
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });
  });

  describe('ImageBlock', () => {
    it('renders default alt text as placeholder label', () => {
      render(<BlockRenderer block={makeBlock('ImageBlock')} />);
      expect(screen.getByText('Portal image')).toBeInTheDocument();
    });

    it('renders custom alt text from config', () => {
      render(
        <BlockRenderer
          block={makeBlock('ImageBlock', { alt: 'Course banner' })}
        />
      );
      expect(screen.getByText('Course banner')).toBeInTheDocument();
    });
  });

  describe('CTAButton', () => {
    it('renders default button text', () => {
      render(<BlockRenderer block={makeBlock('CTAButton')} />);
      expect(screen.getByText('Click Here')).toBeInTheDocument();
    });

    it('renders custom button text from config', () => {
      render(
        <BlockRenderer block={makeBlock('CTAButton', { text: 'Enroll Now' })} />
      );
      expect(screen.getByText('Enroll Now')).toBeInTheDocument();
    });
  });

  it('renders "Unknown block type" for unrecognised types', () => {
    render(
      <BlockRenderer
        block={{ id: 'b1', type: 'HeroBanner', order: 0, config: {} }}
      />
    );
    // Use an invalid type cast to simulate an unknown type
    render(
      <BlockRenderer
        block={
          { id: 'b2', type: 'UnknownBlock', order: 0, config: {} } as never
        }
      />
    );
    expect(screen.getByText('Unknown block type')).toBeInTheDocument();
  });
});
