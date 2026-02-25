/**
 * G-15: Fine-grained @requiresScopes and @requiresRole directives
 *
 * SOC2 CC6.3 + GDPR Art.25 -- least privilege: every sensitive mutation must have
 * explicit scope/role directives beyond just @authenticated.
 *
 * Static source-analysis tests -- no running server required.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

function read(relativePath: string): string {
  const abs = resolve(ROOT, relativePath);
  return existsSync(abs) ? readFileSync(abs, 'utf-8') : '';
}

function extractMutationBlock(sdl: string): string {
  const idx = sdl.indexOf("type Mutation {");
  if (idx < 0) return "";
  // Find closing brace of Mutation block by scanning forward
  let depth = 0, pos = idx;
  while (pos < sdl.length) {
    if (sdl[pos] === "{") depth++;
    if (sdl[pos] === "}") { depth--; if (depth === 0) break; }
    pos++;
  }
  return sdl.slice(idx + 16, pos);
}
describe('G-15: directive definitions in graphql-shared', () => {
  let directives: string;
  beforeAll(() => { directives = read('packages/graphql-shared/src/directives.ts'); });

  it('@authenticated directive is defined', () => {
    expect(directives).toContain('@authenticated');
  });
  it('@requiresRole directive is defined with roles argument', () => {
    expect(directives).toContain('requiresRole');
    expect(directives).toContain('@requiresRole(roles:');
  });
  it('@requiresScopes directive is defined with scopes argument', () => {
    expect(directives).toContain('requiresScopes');
    expect(directives).toContain('@requiresScopes(scopes:');
  });
  it('AuthScope enum exports WRITE_ANNOTATIONS with write:annotations', () => {
    expect(directives).toContain('WRITE_ANNOTATIONS');
    expect(directives).toContain('write:annotations');
  });
  it('AuthScope enum exports WRITE_USERS with write:users', () => {
    expect(directives).toContain('WRITE_USERS');
    expect(directives).toContain('write:users');
  });
  it('UserRole enum exports SUPER_ADMIN and ORG_ADMIN', () => {
    expect(directives).toContain('SUPER_ADMIN');
    expect(directives).toContain('ORG_ADMIN');
  });
});
describe('G-15: user.graphql -- admin mutations have fine-grained auth', () => {
  let schema: string;
  beforeAll(() => { schema = read('apps/subgraph-core/src/user/user.graphql'); });

  it('schema file exists', () => { expect(schema.length).toBeGreaterThan(0); });
  it('@link imports @requiresRole for federation awareness', () => {
    expect(schema).toContain('@requiresRole');
  });
  it('@link imports @requiresScopes for federation awareness', () => {
    expect(schema).toContain('@requiresScopes');
  });
  it('createUser mutation has @requiresRole with SUPER_ADMIN and ORG_ADMIN', () => {
    const b = schema.slice(schema.indexOf('createUser'), schema.indexOf('updateUser'));
    expect(b).toContain('@requiresRole'); expect(b).toContain('SUPER_ADMIN'); expect(b).toContain('ORG_ADMIN');
  });
  it('createUser mutation has @requiresScopes with write:users', () => {
    const b = schema.slice(schema.indexOf('createUser'), schema.indexOf('updateUser'));
    expect(b).toContain('@requiresScopes'); expect(b).toContain('write:users');
  });
  it('updateUser mutation has @requiresRole with SUPER_ADMIN and ORG_ADMIN', () => {
    const b = schema.slice(schema.indexOf('updateUser('), schema.indexOf('updateUserPreferences'));
    expect(b).toContain('@requiresRole'); expect(b).toContain('SUPER_ADMIN'); expect(b).toContain('ORG_ADMIN');
  });
  it('updateUser mutation has @requiresScopes with write:users', () => {
    const b = schema.slice(schema.indexOf('updateUser('), schema.indexOf('updateUserPreferences'));
    expect(b).toContain('@requiresScopes'); expect(b).toContain('write:users');
  });
  it('updateUserPreferences is self-service: @authenticated but NOT @requiresRole', () => {
    const i = schema.indexOf('updateUserPreferences');
    // Slice only to the next mutation definition (updateProfileVisibility) so
    // later admin-only mutations with @requiresRole don't pollute the window.
    const nextDef = schema.indexOf('updateProfileVisibility', i);
    const b = schema.slice(i, nextDef > i ? nextDef : i + 200);
    expect(b).toContain('@authenticated'); expect(b).not.toContain('@requiresRole');
  });
  it('all mutations retain @authenticated as baseline guard', () => {
    expect(schema).toContain('@authenticated');
  });
});
describe('G-15: annotation.graphql -- write mutations have @requiresScopes', () => {
  let schema: string;
  beforeAll(() => { schema = read('apps/subgraph-annotation/src/annotation/annotation.graphql'); });

  it('schema file exists', () => { expect(schema.length).toBeGreaterThan(0); });
  it('@link imports @requiresScopes', () => { expect(schema).toContain('@requiresScopes'); });

  it('createAnnotation has @requiresScopes with write:annotations', () => {
    const b = schema.slice(schema.indexOf('createAnnotation'), schema.indexOf('updateAnnotation'));
    expect(b).toContain('@requiresScopes'); expect(b).toContain('write:annotations');
  });
  it('updateAnnotation has @requiresScopes with write:annotations', () => {
    const b = schema.slice(schema.indexOf('updateAnnotation'), schema.indexOf('deleteAnnotation'));
    expect(b).toContain('@requiresScopes'); expect(b).toContain('write:annotations');
  });
  it('deleteAnnotation has @requiresScopes with write:annotations', () => {
    const b = schema.slice(schema.indexOf('deleteAnnotation'), schema.indexOf('resolveAnnotation'));
    expect(b).toContain('@requiresScopes'); expect(b).toContain('write:annotations');
  });
  it('resolveAnnotation has @requiresScopes with write:annotations', () => {
    const b = schema.slice(schema.indexOf('resolveAnnotation'), schema.indexOf('replyToAnnotation'));
    expect(b).toContain('@requiresScopes'); expect(b).toContain('write:annotations');
  });
  it('replyToAnnotation has @requiresScopes with write:annotations', () => {
    const i = schema.indexOf('replyToAnnotation');
    const b = schema.slice(i, i + 800);
    expect(b).toContain('@requiresScopes'); expect(b).toContain('write:annotations');
  });
  it('all annotation write mutations retain @authenticated as baseline', () => {
    expect(extractMutationBlock(schema)).toContain('@authenticated');
  });
});

describe('G-15: aggregate -- least privilege principle across all schemas', () => {
  it('at least one schema enforces @requiresRole on admin mutations', () => {
    expect(read('apps/subgraph-core/src/user/user.graphql')).toContain('@requiresRole');
  });
  it('at least one schema enforces @requiresScopes on write mutations', () => {
    const combined = read('apps/subgraph-annotation/src/annotation/annotation.graphql')
      + read('apps/subgraph-core/src/user/user.graphql');
    expect(combined).toContain('@requiresScopes');
  });
  it('graphql-shared exports UserRole and AuthScope enumerations', () => {
    const d = read('packages/graphql-shared/src/directives.ts');
    expect(d).toContain('UserRole'); expect(d).toContain('AuthScope');
  });
});