/**
 * VideoMigration.test.ts
 * Verifies Expo SDK 55 migration: expo-av removed, expo-video added,
 * react-native 0.83, react-native-reanimated v4, no expo-av source imports.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const MOBILE_ROOT = resolve(__dirname, '../../../../');
const SRC_ROOT = resolve(__dirname, '../../../');

function readPkg(): Record<string, unknown> & { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } {
  return JSON.parse(readFileSync(resolve(MOBILE_ROOT, 'package.json'), 'utf8')) as Record<string, unknown> & { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
}

describe('Expo SDK 55 migration checks', () => {
  it('package.json uses expo SDK 55', () => {
    const pkg = readPkg();
    expect(pkg.dependencies?.['expo']).toMatch(/~55\./);
  });

  it('package.json does not depend on expo-av', () => {
    const pkg = readPkg();
    expect(pkg.dependencies?.['expo-av']).toBeUndefined();
    expect(pkg.devDependencies?.['expo-av']).toBeUndefined();
  });

  it('package.json includes expo-video', () => {
    const pkg = readPkg();
    expect(pkg.dependencies?.['expo-video']).toBeDefined();
    expect(pkg.dependencies?.['expo-video']).toMatch(/~2\./);
  });

  it('package.json uses react-native 0.83', () => {
    const pkg = readPkg();
    expect(pkg.dependencies?.['react-native']).toBe('0.83.0');
  });

  it('react-native-reanimated is v4', () => {
    const pkg = readPkg();
    const version = pkg.dependencies?.['react-native-reanimated'] ?? '';
    expect(version).toMatch(/\^4\./);
  });

  it('no source files import from expo-av', () => {
    const result = execSync(
      'grep -rl "expo-av" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true',
      { cwd: MOBILE_ROOT, encoding: 'utf8' },
    ) as string;
    expect(result.trim()).toBe('');
  });

  it('app.json has edgeToEdgeEnabled for Android 16+', () => {
    const appJson = JSON.parse(readFileSync(resolve(MOBILE_ROOT, 'app.json'), 'utf8')) as {
      expo?: { android?: { edgeToEdgeEnabled?: boolean } };
    };
    expect(appJson.expo?.android?.edgeToEdgeEnabled).toBe(true);
  });

  it('app.json does not contain newArchEnabled (no longer needed)', () => {
    const raw = readFileSync(resolve(MOBILE_ROOT, 'app.json'), 'utf8');
    expect(raw).not.toContain('newArchEnabled');
  });

  it('SRC_ROOT resolves correctly', () => {
    // Sanity check that path resolution works in this test environment
    expect(SRC_ROOT).toContain('apps');
    expect(SRC_ROOT).toContain('mobile');
  });
});
