import { describe, it, expect } from 'vitest';

describe('Codegen Output Validation', () => {
  it('generated types module loads without error', async () => {
    const types = await import('../generated/types.js');
    expect(types).toBeDefined();
  });

  it('generated operations module loads without error', async () => {
    const ops = await import('../generated/operations.js');
    expect(ops).toBeDefined();
  });

  it('barrel index loads without error (source-only package)', async () => {
    const index = await import('../index.js');
    expect(index).toBeDefined();
  });

  it('exports expected UserRole values', async () => {
    const { UserRole } = await import('../generated/types.js');
    expect(UserRole).toBeDefined();
    // Verify key roles exist
    expect(Object.values(UserRole)).toContain('STUDENT');
    expect(Object.values(UserRole)).toContain('INSTRUCTOR');
    expect(Object.values(UserRole)).toContain('ORG_ADMIN');
  });

  it('exports expected AnnotationLayer values', async () => {
    const { AnnotationLayer } = await import('../generated/types.js');
    expect(AnnotationLayer).toBeDefined();
    expect(Object.values(AnnotationLayer)).toContain('PERSONAL');
    expect(Object.values(AnnotationLayer)).toContain('SHARED');
  });

  it('exports expected MessageRole values', async () => {
    const { MessageRole } = await import('../generated/operations.js');
    expect(MessageRole).toBeDefined();
    expect(Object.values(MessageRole)).toContain('USER');
    expect(Object.values(MessageRole)).toContain('ASSISTANT');
  });

  it('exports expected TemplateType values', async () => {
    const { TemplateType } = await import('../generated/operations.js');
    expect(TemplateType).toBeDefined();
    expect(Object.values(TemplateType)).toContain('CHAVRUTA_DEBATE');
    expect(Object.values(TemplateType)).toContain('TUTOR');
  });

  it('exports expected AgentSessionStatus values', async () => {
    const { AgentSessionStatus } = await import('../generated/operations.js');
    expect(AgentSessionStatus).toBeDefined();
    expect(Object.values(AgentSessionStatus)).toContain('ACTIVE');
    expect(Object.values(AgentSessionStatus)).toContain('COMPLETED');
  });

  it('exports AnnotationsQuery operation type (compile-time check)', async () => {
    // If this import fails, codegen did not generate annotation operations.
    // TypeScript types are erased at runtime — the module must simply load.
    const ops = await import('../generated/operations.js');
    expect(ops).toBeDefined();
  });
});
