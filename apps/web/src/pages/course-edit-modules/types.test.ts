import { describe, it, expect } from 'vitest';
import { CONTENT_TYPES } from './types';
import type {
  ContentType,
  ContentItemSummary,
  ModuleSummary,
  CourseEditModulesProps,
  NewModuleForm,
  NewItemForm,
} from './types';

describe('course-edit-modules/types', () => {
  it('CONTENT_TYPES has expected content types', () => {
    expect(CONTENT_TYPES).toContain('VIDEO');
    expect(CONTENT_TYPES).toContain('PDF');
    expect(CONTENT_TYPES).toContain('QUIZ');
    expect(CONTENT_TYPES).toContain('SCORM');
    expect(CONTENT_TYPES.length).toBeGreaterThanOrEqual(10);
  });

  it('ContentType is a valid CONTENT_TYPES entry', () => {
    const ct: ContentType = 'VIDEO';
    expect(CONTENT_TYPES).toContain(ct);
  });

  it('ContentItemSummary shape is valid', () => {
    const item: ContentItemSummary = {
      id: '1',
      title: 'Item',
      contentType: 'VIDEO',
      orderIndex: 0,
    };
    expect(item.contentType).toBe('VIDEO');
  });

  it('ModuleSummary shape is valid', () => {
    const mod: ModuleSummary = {
      id: '1',
      title: 'Module',
      orderIndex: 0,
      contentItems: [],
    };
    expect(mod.contentItems).toHaveLength(0);
  });

  it('CourseEditModulesProps shape is valid', () => {
    const props: CourseEditModulesProps = {
      courseId: 'c-1',
      modules: [],
      onRefetch: () => {},
      onToast: () => {},
    };
    expect(props.courseId).toBe('c-1');
  });

  it('NewModuleForm shape is valid', () => {
    const form: NewModuleForm = {
      title: 'New Module',
      description: 'A new module',
    };
    expect(form.title).toBe('New Module');
  });

  it('NewItemForm shape is valid', () => {
    const form: NewItemForm = {
      title: 'New Item',
      contentType: 'PDF',
      body: 'Content body',
    };
    expect(form.contentType).toBe('PDF');
  });
});
