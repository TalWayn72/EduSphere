import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('seed.ts — instructor locale preference', () => {
  const seedSource = fs.readFileSync(
    path.resolve(__dirname, 'seed.ts'),
    'utf-8',
  );

  it('instructor user entry contains locale: he', () => {
    // The instructor block (email: instructor@example.com) must set Hebrew locale
    expect(seedSource).toContain("locale: 'he'");
  });

  it('instructor preferences object has the correct structure', () => {
    // Extract the preferences block for the instructor user.
    // The instructor is identified by email 'instructor@example.com'.
    const instructorBlockMatch = seedSource.match(
      /email:\s*'instructor@example\.com'[\s\S]*?preferences:\s*\{([\s\S]*?)\}/,
    );
    expect(instructorBlockMatch).not.toBeNull();

    const prefsBlock = instructorBlockMatch![1];

    // Verify all required preference keys are present
    expect(prefsBlock).toContain("locale: 'he'");
    expect(prefsBlock).toContain("theme: 'system'");
    expect(prefsBlock).toContain('emailNotifications: true');
    expect(prefsBlock).toContain('pushNotifications: true');
    expect(prefsBlock).toContain('isPublicProfile: false');
  });

  it('no other demo user overrides locale (only instructor)', () => {
    // Count occurrences of locale: — should appear exactly once (instructor only)
    const localeMatches = seedSource.match(/locale:\s*'/g);
    expect(localeMatches).toHaveLength(1);
  });
});
