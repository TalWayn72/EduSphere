import { describe, it, expect } from 'vitest';
import { LIBRARY_COURSES_QUERY, MY_LIBRARY_ACTIVATIONS_QUERY, ACTIVATE_LIBRARY_COURSE_MUTATION, DEACTIVATE_LIBRARY_COURSE_MUTATION } from './library.queries';

describe('library.queries', () => {
  it('exports LIBRARY_COURSES_QUERY as a query string', () => {
    expect(LIBRARY_COURSES_QUERY).toBeDefined();
    expect(typeof LIBRARY_COURSES_QUERY).toBe('string');
    expect(LIBRARY_COURSES_QUERY).toContain('query LibraryCourses');
  });

  it('exports MY_LIBRARY_ACTIVATIONS_QUERY as a query string', () => {
    expect(MY_LIBRARY_ACTIVATIONS_QUERY).toBeDefined();
    expect(typeof MY_LIBRARY_ACTIVATIONS_QUERY).toBe('string');
    expect(MY_LIBRARY_ACTIVATIONS_QUERY).toContain('query MyLibraryActivations');
  });

  it('exports ACTIVATE_LIBRARY_COURSE_MUTATION as a mutation string', () => {
    expect(ACTIVATE_LIBRARY_COURSE_MUTATION).toBeDefined();
    expect(typeof ACTIVATE_LIBRARY_COURSE_MUTATION).toBe('string');
    expect(ACTIVATE_LIBRARY_COURSE_MUTATION).toContain('mutation ActivateLibraryCourse');
  });

  it('exports DEACTIVATE_LIBRARY_COURSE_MUTATION as a mutation string', () => {
    expect(DEACTIVATE_LIBRARY_COURSE_MUTATION).toBeDefined();
    expect(typeof DEACTIVATE_LIBRARY_COURSE_MUTATION).toBe('string');
    expect(DEACTIVATE_LIBRARY_COURSE_MUTATION).toContain('mutation DeactivateLibraryCourse');
  });

});
