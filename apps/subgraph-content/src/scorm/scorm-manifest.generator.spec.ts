import { describe, it, expect } from 'vitest';
import {
  generateManifest2004,
  injectScormApiShim,
  buildVideoHtml,
  buildQuizHtml,
  SCORM_2004_API_SHIM,
} from './scorm-manifest.generator.js';

// ── Minimal ContentItem stub (mirrors @edusphere/db ContentItem shape) ────────

type ContentItemStub = {
  id: string;
  title: string;
  type: string;
  content: string | null;
  [key: string]: unknown;
};

function makeItem(overrides: Partial<ContentItemStub> = {}): ContentItemStub {
  return {
    id: 'item-uuid-001',
    title: 'Intro Lesson',
    type: 'MARKDOWN',
    content: null,
    ...overrides,
  };
}

// ── escapeXml (via generateManifest2004 which calls it internally) ────────────
// We test escapeXml indirectly through the public API since it's unexported.
// Direct escape behaviour is exercised in generateManifest2004 with special chars in title.

describe('XML escaping (via generateManifest2004 title field)', () => {
  it('escapes & in course title', () => {
    const course = { id: 'c1', title: 'Science & Math', description: null };
    const xml = generateManifest2004(course, [makeItem()]);
    expect(xml).toContain('Science &amp; Math');
    expect(xml).not.toContain('Science & Math');
  });

  it('escapes < and > in course title', () => {
    const course = { id: 'c2', title: 'A < B > C', description: null };
    const xml = generateManifest2004(course, [makeItem()]);
    expect(xml).toContain('A &lt; B &gt; C');
  });

  it('escapes double-quotes in course title', () => {
    const course = { id: 'c3', title: 'The "Best" Course', description: null };
    const xml = generateManifest2004(course, [makeItem()]);
    expect(xml).toContain('&quot;');
  });

  it('escapes single-quotes (apostrophe) in course title', () => {
    const course = { id: 'c4', title: "It's Alive", description: null };
    const xml = generateManifest2004(course, [makeItem()]);
    expect(xml).toContain('&apos;');
  });

  it('escapes all 5 special XML characters together', () => {
    const course = { id: 'c5', title: `A&B<C>D"E'F`, description: null };
    const xml = generateManifest2004(course, [makeItem()]);
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&gt;');
    expect(xml).toContain('&quot;');
    expect(xml).toContain('&apos;');
  });
});

// ── generateManifest2004 ──────────────────────────────────────────────────────

describe('generateManifest2004', () => {
  const course = {
    id: 'course-abc-123',
    title: 'Torah Studies 101',
    description: null,
  };
  const items = [
    makeItem({ id: 'item-001', title: 'Lesson One', type: 'MARKDOWN' }),
    makeItem({ id: 'item-002', title: 'Quiz One', type: 'QUIZ' }),
  ];

  it('starts with XML declaration header', () => {
    const xml = generateManifest2004(course, items);
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it('contains the course title in the output', () => {
    const xml = generateManifest2004(course, items);
    expect(xml).toContain('Torah Studies 101');
  });

  it('includes SCORM 2004 4th Edition schema version', () => {
    const xml = generateManifest2004(course, items);
    expect(xml).toContain('2004 4th Edition');
  });

  it('generates ITEM- prefixed identifiers for each item', () => {
    const xml = generateManifest2004(course, items);
    expect(xml).toContain('ITEM-item-001');
    expect(xml).toContain('ITEM-item-002');
  });

  it('generates RES- prefixed resource identifiers for each item', () => {
    const xml = generateManifest2004(course, items);
    expect(xml).toContain('RES-item-001');
    expect(xml).toContain('RES-item-002');
  });

  it('uses course id as manifest identifier and org identifier prefix', () => {
    const xml = generateManifest2004(course, items);
    expect(xml).toContain(`identifier="${course.id}"`);
    expect(xml).toContain(`ORG-${course.id}`);
  });

  it('generates video.html href for VIDEO type items', () => {
    const videoItems = [makeItem({ id: 'v1', type: 'VIDEO' })];
    const xml = generateManifest2004(course, videoItems);
    expect(xml).toContain('content/v1/video.html');
  });

  it('generates quiz.html href for QUIZ type items', () => {
    const xml = generateManifest2004(course, items);
    expect(xml).toContain('content/item-002/quiz.html');
  });
});

// ── injectScormApiShim ────────────────────────────────────────────────────────

describe('injectScormApiShim', () => {
  it('injects shim before </head> when </head> is present', () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';
    const result = injectScormApiShim(html);
    expect(result).toContain('<script>');
    expect(result).toContain(SCORM_2004_API_SHIM);
    // Script must appear before </head>
    const scriptIdx = result.indexOf('<script>');
    const headIdx = result.indexOf('</head>');
    expect(scriptIdx).toBeLessThan(headIdx);
  });

  it('injects shim before <body when no </head> is present', () => {
    const html = '<html><body><p>No head tag here</p></body></html>';
    const result = injectScormApiShim(html);
    expect(result).toContain('<script>');
    const scriptIdx = result.indexOf('<script>');
    const bodyIdx = result.indexOf('<body');
    expect(scriptIdx).toBeLessThan(bodyIdx);
  });

  it('prepends shim when neither </head> nor <body is present', () => {
    const html = '<p>Minimal HTML with no head or body tags</p>';
    const result = injectScormApiShim(html);
    expect(result.trimStart()).toMatch(/^<script>/);
    expect(result).toContain(html);
  });

  it('preserves the original HTML content after injection', () => {
    const html = '<html><head></head><body><p>Content</p></body></html>';
    const result = injectScormApiShim(html);
    expect(result).toContain('<p>Content</p>');
    expect(result).toContain('</body></html>');
  });
});

// ── buildVideoHtml ────────────────────────────────────────────────────────────

describe('buildVideoHtml', () => {
  it('generates HTML with a <video> tag', () => {
    const item = makeItem({
      id: 'v1',
      title: 'Lecture 1',
      type: 'VIDEO',
      content: null,
    });
    const html = buildVideoHtml(item as never);
    expect(html).toContain('<video');
    expect(html).toContain('Lecture 1');
  });

  it('includes video source when content has url', () => {
    const item = makeItem({
      id: 'v2',
      title: 'Stream Video',
      type: 'VIDEO',
      content: JSON.stringify({ url: 'https://cdn.example.com/video.mp4' }),
    });
    const html = buildVideoHtml(item as never);
    expect(html).toContain('<source src="https://cdn.example.com/video.mp4">');
  });

  it('omits source tag when content url is missing', () => {
    const item = makeItem({
      id: 'v3',
      title: 'No URL',
      type: 'VIDEO',
      content: '{}',
    });
    const html = buildVideoHtml(item as never);
    expect(html).not.toContain('<source');
  });

  it('is a complete HTML document', () => {
    const item = makeItem({
      id: 'v4',
      title: 'Full Doc',
      type: 'VIDEO',
      content: null,
    });
    const html = buildVideoHtml(item as never);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });
});

// ── buildQuizHtml ─────────────────────────────────────────────────────────────

describe('buildQuizHtml', () => {
  it('generates HTML containing the item title', () => {
    const item = makeItem({
      id: 'q1',
      title: 'Chapter Quiz',
      type: 'QUIZ',
      content: null,
    });
    const html = buildQuizHtml(item as never);
    expect(html).toContain('Chapter Quiz');
  });

  it('is a complete HTML document', () => {
    const item = makeItem({
      id: 'q2',
      title: 'Final Exam',
      type: 'QUIZ',
      content: null,
    });
    const html = buildQuizHtml(item as never);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('mentions EduSphere platform', () => {
    const item = makeItem({
      id: 'q3',
      title: 'Midterm',
      type: 'QUIZ',
      content: null,
    });
    const html = buildQuizHtml(item as never);
    expect(html).toContain('EduSphere');
  });
});
