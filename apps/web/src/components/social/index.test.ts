/**
 * Barrel re-export tests for social/index.ts
 */
import { describe, it, expect } from 'vitest';
import * as barrel from './index';

describe('social/index barrel', () => {
  it('exports SocialShareButton', () => {
    expect(barrel.SocialShareButton).toBeDefined();
    expect(typeof barrel.SocialShareButton).toBe('function');
  });

  it('exports SocialShareMenu', () => {
    expect(barrel.SocialShareMenu).toBeDefined();
    expect(typeof barrel.SocialShareMenu).toBe('function');
  });

  it('exports ShareBadgeDialog', () => {
    expect(barrel.ShareBadgeDialog).toBeDefined();
    expect(typeof barrel.ShareBadgeDialog).toBe('function');
  });

  it('exports SocialLinksBar', () => {
    expect(barrel.SocialLinksBar).toBeDefined();
    expect(typeof barrel.SocialLinksBar).toBe('function');
  });

  it('exports DEFAULT_SOCIAL_LINKS constant', () => {
    expect(barrel.DEFAULT_SOCIAL_LINKS).toBeDefined();
    expect(typeof barrel.DEFAULT_SOCIAL_LINKS).toBe('object');
  });
});
