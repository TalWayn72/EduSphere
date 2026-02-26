export interface Course {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  instructorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  order: number;
  createdAt: Date;
}

export interface ContentItem {
  id: string;
  moduleId: string;
  title: string;
  type: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'ASSIGNMENT';
  url: string;
  order: number;
  createdAt: Date;
}

export function createCourse(overrides?: Partial<Course>): Course {
  return {
    id: 'course-test-001',
    tenantId: 'tenant-test-001',
    title: 'Test Course',
    description: 'A test course for unit testing',
    status: 'PUBLISHED',
    instructorId: 'user-instructor-001',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

export function createCourseModule(
  overrides?: Partial<CourseModule>
): CourseModule {
  return {
    id: 'module-test-001',
    courseId: 'course-test-001',
    title: 'Test Module',
    order: 1,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

export function createContentItem(
  overrides?: Partial<ContentItem>
): ContentItem {
  return {
    id: 'content-test-001',
    moduleId: 'module-test-001',
    title: 'Test Content Item',
    type: 'VIDEO',
    url: 'https://test.example/video/001',
    order: 1,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}
