import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { OptimizedImage } from './OptimizedImage';

describe('OptimizedImage', () => {
  it('renders with loading="lazy" by default', () => {
    const { container } = render(<OptimizedImage src="/test.jpg" alt="test" />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('loading')).toBe('lazy');
  });

  it('renders <picture> with webp source for /uploads/ URLs', () => {
    const { container } = render(
      <OptimizedImage src="/uploads/test.jpg" alt="test" width={100} height={100} />
    );
    expect(container.querySelector('picture')).toBeTruthy();
    expect(container.querySelector('source[type="image/webp"]')).toBeTruthy();
  });

  it('renders <picture> with webp source for minio URLs', () => {
    const { container } = render(
      <OptimizedImage src="http://minio.local/bucket/image.jpg" alt="test" />
    );
    expect(container.querySelector('picture')).toBeTruthy();
  });

  it('renders plain <img> for non-upload URLs', () => {
    const { container } = render(
      <OptimizedImage src="/static/icon.svg" alt="icon" />
    );
    expect(container.querySelector('picture')).toBeFalsy();
    expect(container.querySelector('img')).toBeTruthy();
  });

  it('has decoding="async"', () => {
    const { container } = render(<OptimizedImage src="/test.png" alt="test" />);
    expect(container.querySelector('img')?.getAttribute('decoding')).toBe('async');
  });

  it('accepts loading="eager"', () => {
    const { container } = render(
      <OptimizedImage src="/test.png" alt="test" loading="eager" />
    );
    expect(container.querySelector('img')?.getAttribute('loading')).toBe('eager');
  });

  it('applies className to the img element', () => {
    const { container } = render(
      <OptimizedImage src="/test.png" alt="test" className="rounded-lg" />
    );
    expect(container.querySelector('img')?.classList.contains('rounded-lg')).toBe(true);
  });

  it('sets width and height on img to prevent CLS', () => {
    const { container } = render(
      <OptimizedImage src="/test.png" alt="test" width={400} height={300} />
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('width')).toBe('400');
    expect(img?.getAttribute('height')).toBe('300');
  });

  it('appends WebP transform params to srcSet', () => {
    const { container } = render(
      <OptimizedImage src="/uploads/photo.jpg" alt="photo" />
    );
    const source = container.querySelector('source[type="image/webp"]');
    expect(source?.getAttribute('srcset')).toContain('?tr=f-webp,q-80');
  });
});
