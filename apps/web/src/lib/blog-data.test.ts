import { describe, it, expect } from 'vitest';
import { BLOG_POSTS, getBlogPost } from './blog-data';
import type { BlogPost } from './blog-data';

describe('BLOG_POSTS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(BLOG_POSTS)).toBe(true);
    expect(BLOG_POSTS.length).toBeGreaterThan(0);
  });

  it('each post has all required BlogPost fields', () => {
    BLOG_POSTS.forEach((post: BlogPost) => {
      expect(typeof post.slug).toBe('string');
      expect(post.slug.length).toBeGreaterThan(0);
      expect(typeof post.title).toBe('string');
      expect(post.title.length).toBeGreaterThan(0);
      expect(typeof post.description).toBe('string');
      expect(post.description.length).toBeGreaterThan(0);
      expect(Array.isArray(post.keywords)).toBe(true);
      expect(post.keywords.length).toBeGreaterThan(0);
      expect(typeof post.category).toBe('string');
      expect(typeof post.author).toBe('string');
      expect(typeof post.authorUrl).toBe('string');
      expect(typeof post.datePublished).toBe('string');
      expect(typeof post.dateModified).toBe('string');
      expect(typeof post.readingTimeMinutes).toBe('number');
      expect(typeof post.bodyMarkdown).toBe('string');
    });
  });

  it('has unique slugs', () => {
    const slugs = BLOG_POSTS.map((p) => p.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it('slugs are URL-safe (kebab-case)', () => {
    BLOG_POSTS.forEach((post) => {
      expect(post.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });
  });

  it('datePublished are valid ISO date strings', () => {
    BLOG_POSTS.forEach((post) => {
      const date = new Date(post.datePublished);
      expect(isNaN(date.getTime())).toBe(false);
    });
  });

  it('dateModified are valid ISO date strings', () => {
    BLOG_POSTS.forEach((post) => {
      const date = new Date(post.dateModified);
      expect(isNaN(date.getTime())).toBe(false);
    });
  });

  it('readingTimeMinutes is a positive number', () => {
    BLOG_POSTS.forEach((post) => {
      expect(post.readingTimeMinutes).toBeGreaterThan(0);
    });
  });

  it('authorUrl starts with https://', () => {
    BLOG_POSTS.forEach((post) => {
      expect(post.authorUrl).toMatch(/^https:\/\//);
    });
  });

  it('bodyMarkdown is non-empty', () => {
    BLOG_POSTS.forEach((post) => {
      expect(post.bodyMarkdown.length).toBeGreaterThan(100);
    });
  });

  it('keywords are non-empty strings', () => {
    BLOG_POSTS.forEach((post) => {
      post.keywords.forEach((kw) => {
        expect(typeof kw).toBe('string');
        expect(kw.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('getBlogPost', () => {
  it('returns the correct post for a valid slug', () => {
    const firstPost = BLOG_POSTS[0]!;
    const result = getBlogPost(firstPost.slug);
    expect(result).toBeDefined();
    expect(result?.slug).toBe(firstPost.slug);
    expect(result?.title).toBe(firstPost.title);
  });

  it('returns undefined for a non-existent slug', () => {
    const result = getBlogPost('this-slug-does-not-exist');
    expect(result).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    const result = getBlogPost('');
    expect(result).toBeUndefined();
  });

  it('finds each post by its slug', () => {
    BLOG_POSTS.forEach((post) => {
      const found = getBlogPost(post.slug);
      expect(found).toBeDefined();
      expect(found?.title).toBe(post.title);
    });
  });
});
