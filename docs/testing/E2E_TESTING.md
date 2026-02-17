# End-to-End Testing Guide

## Overview

EduSphere uses Playwright for end-to-end testing, providing comprehensive coverage of user workflows across multiple browsers and devices.

### Technology Stack

- **Playwright**: Modern E2E testing framework with cross-browser support
- **TypeScript**: Type-safe test implementation
- **Page Object Model**: Maintainable test architecture
- **Visual Regression**: Screenshot comparison testing
- **Accessibility Testing**: WCAG 2.1 AA compliance validation

### Browser Support

Tests run against multiple browsers to ensure cross-platform compatibility:

- **Chromium**: Latest stable version
- **Firefox**: Latest stable version
- **WebKit**: Safari engine for macOS/iOS compatibility
- **Mobile Viewports**: Responsive testing for mobile devices

### Test Execution Modes

- **Headless**: CI/CD pipeline execution (default)
- **Headed**: Local debugging with visible browser
- **Debug**: Step-through debugging with Playwright Inspector
- **UI Mode**: Interactive test runner with time-travel debugging

## Test Structure

### Page Object Model (POM)

EduSphere implements the Page Object Model pattern to maintain clean, reusable, and maintainable test code.

#### Directory Structure

```
tests/
├── e2e/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   ├── registration.spec.ts
│   │   ├── password-reset.spec.ts
│   │   └── sso.spec.ts
│   ├── courses/
│   │   ├── course-creation.spec.ts
│   │   ├── course-editing.spec.ts
│   │   ├── course-deletion.spec.ts
│   │   ├── course-enrollment.spec.ts
│   │   └── course-search.spec.ts
│   ├── video/
│   │   ├── video-playback.spec.ts
│   │   ├── video-annotations.spec.ts
│   │   ├── video-transcripts.spec.ts
│   │   └── video-quality.spec.ts
│   ├── ai/
│   │   ├── ai-chat.spec.ts
│   │   ├── ai-recommendations.spec.ts
│   │   └── ai-content-generation.spec.ts
│   ├── collaboration/
│   │   ├── discussions.spec.ts
│   │   ├── group-work.spec.ts
│   │   └── peer-review.spec.ts
│   └── accessibility/
│       ├── keyboard-navigation.spec.ts
│       ├── screen-reader.spec.ts
│       └── color-contrast.spec.ts
├── pages/
│   ├── BasePage.ts
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   ├── CoursePage.ts
│   ├── VideoPlayerPage.ts
│   ├── AIAssistantPage.ts
│   └── SearchPage.ts
├── fixtures/
│   ├── authFixtures.ts
│   ├── courseFixtures.ts
│   ├── userFixtures.ts
│   └── testData.ts
└── utils/
    ├── testHelpers.ts
    ├── apiHelpers.ts
    └── dataFactories.ts
```

#### Base Page Object

```typescript
// tests/pages/BasePage.ts
import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly header: Locator;
  readonly footer: Locator;
  readonly notificationBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header[role="banner"]');
    this.footer = page.locator('footer[role="contentinfo"]');
    this.notificationBanner = page.locator('[role="alert"]');
  }

  async navigate(path: string) {
    await this.page.goto(path);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async getNotificationText(): Promise<string> {
    return await this.notificationBanner.textContent() || '';
  }

  async clickNavigation(menuItem: string) {
    await this.header.getByRole('link', { name: menuItem }).click();
  }
}
```

#### Example Page Object

```typescript
// tests/pages/CoursePage.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class CoursePage extends BasePage {
  readonly createCourseButton: Locator;
  readonly courseTitle: Locator;
  readonly courseDescription: Locator;
  readonly courseThumbnail: Locator;
  readonly publishButton: Locator;
  readonly saveAsDraftButton: Locator;
  readonly courseList: Locator;

  constructor(page: Page) {
    super(page);
    this.createCourseButton = page.getByRole('button', { name: 'Create Course' });
    this.courseTitle = page.getByLabel('Course Title');
    this.courseDescription = page.getByLabel('Course Description');
    this.courseThumbnail = page.locator('input[type="file"][name="thumbnail"]');
    this.publishButton = page.getByRole('button', { name: 'Publish' });
    this.saveAsDraftButton = page.getByRole('button', { name: 'Save as Draft' });
    this.courseList = page.locator('[data-testid="course-list"]');
  }

  async createCourse(title: string, description: string) {
    await this.createCourseButton.click();
    await this.courseTitle.fill(title);
    await this.courseDescription.fill(description);
  }

  async publishCourse() {
    await this.publishButton.click();
    await this.waitForPageLoad();
  }

  async getCourseByTitle(title: string) {
    return this.courseList.getByText(title).first();
  }
}
```

## User Flows

### Authentication Flows

#### 1. User Login
```typescript
test('user can log in with valid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigate('/login');
  await loginPage.login('student@example.com', 'password123');
  await expect(page).toHaveURL('/dashboard');
});
```

#### 2. User Registration
```typescript
test('new user can register', async ({ page }) => {
  const registrationPage = new RegistrationPage(page);
  await registrationPage.navigate('/register');
  await registrationPage.register({
    email: 'newuser@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'student'
  });
  await expect(page).toHaveURL('/onboarding');
});
```

#### 3. Password Reset
```typescript
test('user can reset forgotten password', async ({ page }) => {
  const resetPage = new PasswordResetPage(page);
  await resetPage.navigate('/forgot-password');
  await resetPage.requestReset('user@example.com');
  await expect(resetPage.successMessage).toBeVisible();
});
```

#### 4. SSO Login
```typescript
test('user can authenticate via SSO', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigate('/login');
  await loginPage.clickSSOProvider('Google');
  // Handle OAuth flow
  await expect(page).toHaveURL('/dashboard');
});
```

#### 5. Session Timeout
```typescript
test('session expires after inactivity', async ({ page, context }) => {
  // Set short session timeout for testing
  await context.addCookies([{
    name: 'session_timeout',
    value: '60',
    domain: 'localhost',
    path: '/'
  }]);
  // Wait and verify redirect
});
```

#### 6. Multi-Factor Authentication
```typescript
test('user can enable and use 2FA', async ({ page }) => {
  const mfaPage = new MFAPage(page);
  await mfaPage.navigate('/settings/security');
  await mfaPage.enable2FA();
  await mfaPage.verifyWithTOTP('123456');
});
```

### Course Management Flows

#### 7. Create Course
```typescript
test('instructor can create new course', async ({ page, authenticatedUser }) => {
  const coursePage = new CoursePage(page);
  await coursePage.navigate('/courses/new');
  await coursePage.createCourse('Introduction to AI', 'Learn AI fundamentals');
  await coursePage.publishCourse();
  await expect(coursePage.successNotification).toContainText('Course published');
});
```

#### 8. Edit Course
```typescript
test('instructor can edit existing course', async ({ page }) => {
  const coursePage = new CoursePage(page);
  await coursePage.navigate('/courses/123/edit');
  await coursePage.updateTitle('Advanced AI Concepts');
  await coursePage.save();
});
```

#### 9. Delete Course
```typescript
test('instructor can delete course with confirmation', async ({ page }) => {
  const coursePage = new CoursePage(page);
  await coursePage.navigate('/courses/123');
  await coursePage.deleteCourse();
  await coursePage.confirmDeletion();
  await expect(page).toHaveURL('/courses');
});
```

#### 10. Course Enrollment
```typescript
test('student can enroll in course', async ({ page }) => {
  const coursePage = new CoursePage(page);
  await coursePage.navigate('/courses/123');
  await coursePage.enrollButton.click();
  await expect(coursePage.enrollmentStatus).toContainText('Enrolled');
});
```

#### 11. Course Unenrollment
```typescript
test('student can unenroll from course', async ({ page }) => {
  const coursePage = new CoursePage(page);
  await coursePage.navigate('/my-courses/123');
  await coursePage.unenroll();
  await coursePage.confirmUnenrollment();
});
```

#### 12. Course Search and Filter
```typescript
test('user can search and filter courses', async ({ page }) => {
  const searchPage = new SearchPage(page);
  await searchPage.navigate('/courses');
  await searchPage.search('machine learning');
  await searchPage.filterByCategory('Computer Science');
  await searchPage.filterByLevel('Intermediate');
  await expect(searchPage.results).toHaveCount(5);
});
```

### Video Player Flows

#### 13. Video Playback
```typescript
test('student can play course video', async ({ page }) => {
  const videoPage = new VideoPlayerPage(page);
  await videoPage.navigate('/courses/123/lessons/1');
  await videoPage.play();
  await expect(videoPage.player).toHaveAttribute('playing', 'true');
});
```

#### 14. Video Quality Selection
```typescript
test('user can change video quality', async ({ page }) => {
  const videoPage = new VideoPlayerPage(page);
  await videoPage.navigate('/courses/123/lessons/1');
  await videoPage.openQualityMenu();
  await videoPage.selectQuality('720p');
  await expect(videoPage.currentQuality).toContainText('720p');
});
```

#### 15. Video Playback Speed
```typescript
test('user can adjust playback speed', async ({ page }) => {
  const videoPage = new VideoPlayerPage(page);
  await videoPage.navigate('/courses/123/lessons/1');
  await videoPage.setPlaybackSpeed(1.5);
  await expect(videoPage.speedIndicator).toContainText('1.5x');
});
```

#### 16. Video Bookmarking
```typescript
test('user can bookmark video timestamp', async ({ page }) => {
  const videoPage = new VideoPlayerPage(page);
  await videoPage.navigate('/courses/123/lessons/1');
  await videoPage.seekTo(120); // 2 minutes
  await videoPage.addBookmark('Important concept');
  await expect(videoPage.bookmarks).toContainText('Important concept');
});
```

#### 17. Video Transcript Display
```typescript
test('user can view synchronized transcript', async ({ page }) => {
  const videoPage = new VideoPlayerPage(page);
  await videoPage.navigate('/courses/123/lessons/1');
  await videoPage.showTranscript();
  await videoPage.play();
  await page.waitForTimeout(5000);
  await expect(videoPage.activeTranscriptLine).toBeVisible();
});
```

### Annotation Flows

#### 18. Create Text Annotation
```typescript
test('user can create text annotation on video', async ({ page }) => {
  const videoPage = new VideoPlayerPage(page);
  await videoPage.navigate('/courses/123/lessons/1');
  await videoPage.seekTo(60);
  await videoPage.createAnnotation('This is a key point');
  await expect(videoPage.annotations).toContainText('This is a key point');
});
```

#### 19. Reply to Annotation
```typescript
test('user can reply to existing annotation', async ({ page }) => {
  const videoPage = new VideoPlayerPage(page);
  await videoPage.navigate('/courses/123/lessons/1');
  const annotation = videoPage.getAnnotationById('ann-123');
  await annotation.reply('Great explanation!');
  await expect(annotation.replies).toHaveCount(1);
});
```

#### 20. Edit Annotation
```typescript
test('user can edit their annotation', async ({ page }) => {
  const videoPage = new VideoPlayerPage(page);
  await videoPage.navigate('/courses/123/lessons/1');
  const annotation = videoPage.getAnnotationById('ann-123');
  await annotation.edit('Updated annotation text');
  await expect(annotation.content).toContainText('Updated annotation text');
});
```

#### 21. Delete Annotation
```typescript
test('user can delete their annotation', async ({ page }) => {
  const videoPage = new VideoPlayerPage(page);
  await videoPage.navigate('/courses/123/lessons/1');
  const annotation = videoPage.getAnnotationById('ann-123');
  await annotation.delete();
  await annotation.confirmDeletion();
  await expect(annotation.element).not.toBeVisible();
});
```

### AI Chat Flows

#### 22. AI Chat Query
```typescript
test('student can ask AI assistant question', async ({ page }) => {
  const aiPage = new AIAssistantPage(page);
  await aiPage.navigate('/courses/123/ai-assistant');
  await aiPage.sendMessage('Explain quantum computing');
  await expect(aiPage.lastResponse).toContainText('quantum');
});
```

#### 23. AI Context Awareness
```typescript
test('AI provides context-aware responses', async ({ page }) => {
  const aiPage = new AIAssistantPage(page);
  await aiPage.navigate('/courses/123/lessons/5/ai-assistant');
  await aiPage.sendMessage('What did we just learn?');
  await expect(aiPage.lastResponse).toContainText('lesson 5');
});
```

#### 24. AI Recommendations
```typescript
test('AI suggests relevant learning materials', async ({ page }) => {
  const aiPage = new AIAssistantPage(page);
  await aiPage.navigate('/dashboard/ai-assistant');
  await aiPage.requestRecommendations();
  await expect(aiPage.recommendations).toHaveCount(3);
});
```

#### 25. AI Content Generation
```typescript
test('instructor can generate quiz with AI', async ({ page }) => {
  const aiPage = new AIAssistantPage(page);
  await aiPage.navigate('/courses/123/quizzes/new');
  await aiPage.generateQuiz('machine learning basics', 5);
  await expect(aiPage.generatedQuestions).toHaveCount(5);
});
```

### Search Flows

#### 26. Global Search
```typescript
test('user can search across platform', async ({ page }) => {
  const searchPage = new SearchPage(page);
  await searchPage.navigate('/');
  await searchPage.globalSearch('neural networks');
  await expect(searchPage.results).toBeVisible();
  await expect(searchPage.courseResults).toHaveCountGreaterThan(0);
});
```

#### 27. Advanced Search Filters
```typescript
test('user can apply multiple search filters', async ({ page }) => {
  const searchPage = new SearchPage(page);
  await searchPage.navigate('/search');
  await searchPage.search('programming');
  await searchPage.applyFilters({
    category: 'Computer Science',
    difficulty: 'Beginner',
    duration: 'Under 10 hours',
    rating: '4+ stars'
  });
  await expect(searchPage.filteredResults).toBeVisible();
});
```

#### 28. Search Autocomplete
```typescript
test('search provides autocomplete suggestions', async ({ page }) => {
  const searchPage = new SearchPage(page);
  await searchPage.navigate('/');
  await searchPage.typeInSearch('mach');
  await expect(searchPage.suggestions).toContainText('machine learning');
  await searchPage.selectSuggestion('machine learning');
});
```

### Collaboration Flows

#### 29. Discussion Forum Post
```typescript
test('student can create discussion post', async ({ page }) => {
  const discussionPage = new DiscussionPage(page);
  await discussionPage.navigate('/courses/123/discussions');
  await discussionPage.createPost('Help with assignment 3', 'I need clarification...');
  await expect(discussionPage.posts).toContainText('Help with assignment 3');
});
```

#### 30. Group Work Collaboration
```typescript
test('students can collaborate in groups', async ({ page }) => {
  const groupPage = new GroupPage(page);
  await groupPage.navigate('/courses/123/groups/5');
  await groupPage.shareDocument('project-plan.pdf');
  await groupPage.addComment('Looks good!');
  await expect(groupPage.documents).toContainText('project-plan.pdf');
});
```

#### 31. Peer Review Submission
```typescript
test('student can submit peer review', async ({ page }) => {
  const reviewPage = new PeerReviewPage(page);
  await reviewPage.navigate('/courses/123/assignments/7/review/student-456');
  await reviewPage.provideFeedback({
    criteria1: 4,
    criteria2: 5,
    comments: 'Excellent work on the implementation'
  });
  await reviewPage.submit();
  await expect(reviewPage.successMessage).toBeVisible();
});
```

### Additional Critical Flows

#### 32. Assignment Submission
```typescript
test('student can submit assignment', async ({ page }) => {
  const assignmentPage = new AssignmentPage(page);
  await assignmentPage.navigate('/courses/123/assignments/1');
  await assignmentPage.uploadFile('homework.pdf');
  await assignmentPage.addNotes('Completed all requirements');
  await assignmentPage.submit();
  await expect(assignmentPage.submissionStatus).toContainText('Submitted');
});
```

#### 33. Quiz Taking
```typescript
test('student can take and submit quiz', async ({ page }) => {
  const quizPage = new QuizPage(page);
  await quizPage.navigate('/courses/123/quizzes/1');
  await quizPage.startQuiz();
  await quizPage.answerQuestion(1, 'B');
  await quizPage.answerQuestion(2, 'C');
  await quizPage.submit();
  await expect(quizPage.score).toBeVisible();
});
```

#### 34. Progress Tracking
```typescript
test('student can view learning progress', async ({ page }) => {
  const progressPage = new ProgressPage(page);
  await progressPage.navigate('/courses/123/progress');
  await expect(progressPage.completionPercentage).toContainText('67%');
  await expect(progressPage.completedLessons).toHaveCount(8);
});
```

#### 35. Notifications Management
```typescript
test('user can manage notification preferences', async ({ page }) => {
  const settingsPage = new SettingsPage(page);
  await settingsPage.navigate('/settings/notifications');
  await settingsPage.toggleNotification('email_announcements', false);
  await settingsPage.save();
  await expect(settingsPage.successMessage).toBeVisible();
});
```

## Fixtures

### Authenticated User Fixtures

```typescript
// tests/fixtures/authFixtures.ts
import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

type AuthFixtures = {
  authenticatedUser: Page;
  authenticatedAdmin: Page;
  authenticatedInstructor: Page;
  authenticatedStudent: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedUser: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate('/login');
    await loginPage.login(
      process.env.TEST_USER_EMAIL!,
      process.env.TEST_USER_PASSWORD!
    );
    await use(page);
  },

  authenticatedAdmin: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate('/login');
    await loginPage.login(
      process.env.ADMIN_EMAIL!,
      process.env.ADMIN_PASSWORD!
    );
    await use(page);
  },

  authenticatedInstructor: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate('/login');
    await loginPage.login(
      process.env.INSTRUCTOR_EMAIL!,
      process.env.INSTRUCTOR_PASSWORD!
    );
    await use(page);
  },

  authenticatedStudent: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate('/login');
    await loginPage.login(
      process.env.STUDENT_EMAIL!,
      process.env.STUDENT_PASSWORD!
    );
    await use(page);
  }
});

export { expect } from '@playwright/test';
```

### Course Fixtures

```typescript
// tests/fixtures/courseFixtures.ts
import { test as base } from '@playwright/test';
import { createCourse, deleteCourse } from '../utils/apiHelpers';

type CourseFixtures = {
  testCourse: { id: string; title: string };
  publishedCourse: { id: string; title: string };
};

export const test = base.extend<CourseFixtures>({
  testCourse: async ({ page }, use) => {
    // Create test course before test
    const course = await createCourse({
      title: 'Test Course',
      description: 'Course for testing',
      status: 'draft'
    });

    await use(course);

    // Cleanup after test
    await deleteCourse(course.id);
  },

  publishedCourse: async ({ page }, use) => {
    const course = await createCourse({
      title: 'Published Test Course',
      description: 'Published course for testing',
      status: 'published'
    });

    await use(course);
    await deleteCourse(course.id);
  }
});
```

## Test Data

### Seed Scripts

```typescript
// tests/utils/seedDatabase.ts
import { prisma } from '@/lib/prisma';
import { hash } from 'bcrypt';

export async function seedTestData() {
  // Create test users
  const studentPassword = await hash('StudentPass123!', 10);
  const student = await prisma.user.create({
    data: {
      email: 'student@test.com',
      password: studentPassword,
      firstName: 'Test',
      lastName: 'Student',
      role: 'STUDENT'
    }
  });

  const instructorPassword = await hash('InstructorPass123!', 10);
  const instructor = await prisma.user.create({
    data: {
      email: 'instructor@test.com',
      password: instructorPassword,
      firstName: 'Test',
      lastName: 'Instructor',
      role: 'INSTRUCTOR'
    }
  });

  // Create test courses
  const course = await prisma.course.create({
    data: {
      title: 'Introduction to Machine Learning',
      description: 'Learn the basics of ML',
      instructorId: instructor.id,
      status: 'PUBLISHED',
      lessons: {
        create: [
          {
            title: 'What is Machine Learning?',
            content: 'Introduction to ML concepts',
            order: 1,
            videoUrl: 'https://example.com/video1.mp4'
          },
          {
            title: 'Supervised Learning',
            content: 'Understanding supervised algorithms',
            order: 2,
            videoUrl: 'https://example.com/video2.mp4'
          }
        ]
      }
    }
  });

  return { student, instructor, course };
}

export async function cleanupTestData() {
  await prisma.enrollment.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.user.deleteMany({
    where: { email: { contains: '@test.com' } }
  });
}
```

### Data Factories

```typescript
// tests/utils/dataFactories.ts
import { faker } from '@faker-js/faker';

export const UserFactory = {
  build: (overrides = {}) => ({
    email: faker.internet.email(),
    password: 'SecurePass123!',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: 'STUDENT',
    ...overrides
  })
};

export const CourseFactory = {
  build: (overrides = {}) => ({
    title: faker.lorem.words(3),
    description: faker.lorem.paragraph(),
    category: faker.helpers.arrayElement(['CS', 'Math', 'Science']),
    level: faker.helpers.arrayElement(['Beginner', 'Intermediate', 'Advanced']),
    duration: faker.number.int({ min: 5, max: 100 }),
    ...overrides
  })
};

export const LessonFactory = {
  build: (overrides = {}) => ({
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(3),
    videoUrl: faker.internet.url(),
    duration: faker.number.int({ min: 5, max: 60 }),
    ...overrides
  })
};

export const AnnotationFactory = {
  build: (overrides = {}) => ({
    timestamp: faker.number.int({ min: 0, max: 3600 }),
    content: faker.lorem.sentence(),
    type: faker.helpers.arrayElement(['note', 'question', 'highlight']),
    ...overrides
  })
};
```

## Assertions

### Visual Regression Testing

```typescript
// Visual snapshot comparison
test('course page matches visual snapshot', async ({ page }) => {
  await page.goto('/courses/123');
  await expect(page).toHaveScreenshot('course-page.png', {
    maxDiffPixels: 100,
    threshold: 0.2
  });
});

// Component-level snapshot
test('video player controls match snapshot', async ({ page }) => {
  await page.goto('/courses/123/lessons/1');
  const controls = page.locator('[data-testid="video-controls"]');
  await expect(controls).toHaveScreenshot('video-controls.png');
});

// Responsive snapshots
test('dashboard is responsive', async ({ page }) => {
  // Desktop
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard-desktop.png');

  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page).toHaveScreenshot('dashboard-tablet.png');

  // Mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page).toHaveScreenshot('dashboard-mobile.png');
});
```

### Accessibility Testing

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('course page is accessible', async ({ page }) => {
  await page.goto('/courses/123');
  await injectAxe(page);
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: { html: true }
  });
});

test('video player has keyboard navigation', async ({ page }) => {
  await page.goto('/courses/123/lessons/1');

  // Tab to play button
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-testid="play-button"]')).toBeFocused();

  // Space to play
  await page.keyboard.press('Space');
  await expect(page.locator('video')).toHaveAttribute('playing', 'true');

  // Arrow keys for seek
  await page.keyboard.press('ArrowRight');
  // Verify video progressed
});

test('forms have proper ARIA labels', async ({ page }) => {
  await page.goto('/courses/new');

  const titleInput = page.getByLabel('Course Title');
  await expect(titleInput).toHaveAttribute('aria-required', 'true');

  const descInput = page.getByLabel('Course Description');
  await expect(descInput).toHaveAttribute('aria-describedby');
});

test('color contrast meets WCAG AA', async ({ page }) => {
  await page.goto('/courses/123');
  await injectAxe(page);
  await checkA11y(page, null, {
    rules: {
      'color-contrast': { enabled: true }
    }
  });
});
```

### Performance Testing

```typescript
test('course listing loads within performance budget', async ({ page }) => {
  await page.goto('/courses');

  const performanceMetrics = await page.evaluate(() => {
    const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      lcp: timing.loadEventEnd - timing.fetchStart,
      ttfb: timing.responseStart - timing.requestStart
    };
  });

  expect(performanceMetrics.fcp).toBeLessThan(1500);
  expect(performanceMetrics.lcp).toBeLessThan(2500);
  expect(performanceMetrics.ttfb).toBeLessThan(600);
});

test('video player starts within 3 seconds', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/courses/123/lessons/1');
  await page.locator('video').waitFor({ state: 'visible' });
  await page.click('[data-testid="play-button"]');
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video && !video.paused;
  });
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000);
});

test('search results render incrementally', async ({ page }) => {
  await page.goto('/search?q=machine+learning');

  // First results should appear quickly
  await expect(page.locator('[data-testid="search-result"]').first()).toBeVisible({ timeout: 1000 });

  // All results loaded
  await page.waitForLoadState('networkidle');
  const resultCount = await page.locator('[data-testid="search-result"]').count();
  expect(resultCount).toBeGreaterThan(0);
});
```

## CI Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest

    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
        shard: [1, 2, 3, 4]

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: edusphere_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}

      - name: Setup test database
        run: |
          npm run db:migrate:test
          npm run db:seed:test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/edusphere_test

      - name: Run Playwright tests
        run: npx playwright test --project=${{ matrix.browser }} --shard=${{ matrix.shard }}/4
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/edusphere_test
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
          ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
          ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report-${{ matrix.browser }}-${{ matrix.shard }}
          path: playwright-report/
          retention-days: 30

      - name: Upload trace files
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-traces-${{ matrix.browser }}-${{ matrix.shard }}
          path: test-results/
          retention-days: 7

  merge-reports:
    if: always()
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Download all reports
        uses: actions/download-artifact@v3
        with:
          path: all-reports/

      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-reports

      - name: Upload merged report
        uses: actions/upload-artifact@v3
        with:
          name: merged-playwright-report
          path: playwright-report/
          retention-days: 30
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['github']
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

## Debugging

### Trace Viewer

```bash
# Run tests with trace
npx playwright test --trace on

# Open trace viewer
npx playwright show-trace test-results/example-test/trace.zip
```

The trace viewer provides:
- **Timeline**: Visual timeline of all actions
- **Screenshots**: Automatic screenshots at each step
- **Network Activity**: All network requests and responses
- **Console Logs**: Browser console output
- **DOM Snapshots**: Page state at each step

### Screenshots on Failure

```typescript
// Automatic screenshot on failure (configured in playwright.config.ts)
use: {
  screenshot: 'only-on-failure',
}

// Manual screenshot
test('example test', async ({ page }) => {
  await page.goto('/courses');
  await page.screenshot({ path: 'debug/courses-page.png', fullPage: true });
});
```

### Video Recording

```typescript
// Configure video recording
use: {
  video: 'retain-on-failure', // or 'on', 'off', 'on-first-retry'
}

// Access video path
test('example test', async ({ page }, testInfo) => {
  // Test code...

  console.log(await page.video()?.path());
});
```

### Debug Mode

```bash
# Run tests in debug mode
npx playwright test --debug

# Debug specific test
npx playwright test tests/e2e/courses/course-creation.spec.ts --debug

# Pause on failure
npx playwright test --headed --pause-on-failure
```

### UI Mode (Interactive Debugging)

```bash
# Launch UI mode
npx playwright test --ui

# Features:
# - Watch mode with file watcher
# - Time-travel debugging
# - Pick locator tool
# - Network inspection
# - Console logs
```

### Console Logging

```typescript
test('debug example', async ({ page }) => {
  // Listen to console messages
  page.on('console', msg => {
    console.log(`Browser console: ${msg.type()}: ${msg.text()}`);
  });

  // Listen to page errors
  page.on('pageerror', error => {
    console.error(`Page error: ${error.message}`);
  });

  await page.goto('/courses');
});
```

## Best Practices

### Test Organization

1. **Use Page Object Model**: Encapsulate page logic in page objects
2. **Keep Tests Independent**: Each test should be able to run in isolation
3. **Use Descriptive Names**: Test names should clearly describe what they test
4. **Group Related Tests**: Use describe blocks to organize tests by feature
5. **Avoid Test Interdependencies**: Tests should not rely on execution order

```typescript
// Good: Independent, descriptive test
test('instructor can publish draft course from course list', async ({ page }) => {
  // Clear test setup, execution, and assertions
});

// Bad: Vague, dependent test
test('test course', async ({ page }) => {
  // Unclear what is being tested
});
```

### Locator Strategies

1. **Prefer User-Facing Attributes**
   - Use `getByRole`, `getByLabel`, `getByText` first
   - These are more resilient to implementation changes

```typescript
// Good: User-facing locators
await page.getByRole('button', { name: 'Create Course' }).click();
await page.getByLabel('Course Title').fill('New Course');

// Avoid: Implementation details
await page.locator('.btn-primary').click();
await page.locator('#course-title-input').fill('New Course');
```

2. **Use data-testid for Stable Selectors**
   - For elements without good user-facing attributes
   - Use semantic naming

```typescript
// Good: Semantic data-testid
await page.locator('[data-testid="course-enrollment-status"]').click();

// Avoid: Generic data-testid
await page.locator('[data-testid="div-1"]').click();
```

### Waiting Strategies

1. **Use Auto-Waiting**: Playwright waits automatically for most actions
2. **Avoid Hard Waits**: Don't use `page.waitForTimeout()` except for demonstrations
3. **Wait for Specific Conditions**: Use `waitFor` with specific states

```typescript
// Good: Wait for specific condition
await page.locator('[data-testid="course-list"]').waitFor({ state: 'visible' });
await page.waitForLoadState('networkidle');

// Bad: Hard wait
await page.waitForTimeout(5000);
```

### Error Handling

```typescript
test('handle network errors gracefully', async ({ page }) => {
  // Simulate network failure
  await page.route('**/api/courses', route => route.abort());

  await page.goto('/courses');
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
});
```

### Data Management

1. **Use Fixtures for Setup/Teardown**: Automate test data creation and cleanup
2. **Isolate Test Data**: Each test should have its own data
3. **Clean Up After Tests**: Remove test data to prevent pollution

```typescript
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed') {
    // Additional cleanup for failed tests
  }
  // Regular cleanup
  await cleanupTestData();
});
```

### Performance Optimization

1. **Run Tests in Parallel**: Use Playwright's parallelization
2. **Shard Tests**: Distribute tests across multiple machines in CI
3. **Use API for Setup**: Use API calls for test setup when possible

```typescript
// Good: Use API for setup
test.beforeEach(async ({ request }) => {
  // Fast API-based setup
  await request.post('/api/courses', {
    data: { title: 'Test Course', status: 'published' }
  });
});

// Avoid: UI-based setup when not necessary
test.beforeEach(async ({ page }) => {
  // Slow UI-based setup
  await page.goto('/courses/new');
  await page.fill('[name="title"]', 'Test Course');
  await page.click('[name="publish"]');
});
```

## Troubleshooting

### Common Issues

#### Test Timeouts

```typescript
// Issue: Test times out waiting for element
// Solution 1: Increase timeout for specific action
await page.getByRole('button').click({ timeout: 30000 });

// Solution 2: Wait for network to settle
await page.waitForLoadState('networkidle');

// Solution 3: Use custom timeout in config
test.setTimeout(60000);
```

#### Flaky Tests

```typescript
// Issue: Test passes/fails intermittently
// Solution 1: Wait for element to be stable
await page.locator('[data-testid="modal"]').waitFor({ state: 'visible' });
await page.locator('[data-testid="modal"]').waitFor({ state: 'attached' });

// Solution 2: Retry failed tests
// In playwright.config.ts
retries: 2

// Solution 3: Use strict mode to catch multiple elements
await page.getByRole('button', { name: 'Submit' }).click(); // Fails if multiple matches
```

#### Element Not Found

```typescript
// Issue: Element exists but not found
// Solution 1: Check if element is in iframe
const frame = page.frameLocator('iframe[title="video-player"]');
await frame.locator('[data-testid="play-button"]').click();

// Solution 2: Wait for element to be ready
await page.locator('[data-testid="content"]').waitFor({ state: 'visible' });

// Solution 3: Check element is in viewport
await page.locator('[data-testid="footer-link"]').scrollIntoViewIfNeeded();
```

#### Authentication Issues

```typescript
// Issue: Session not persisting between tests
// Solution: Use storageState
test.use({
  storageState: 'auth.json'
});

// Generate auth state
test('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.context().storageState({ path: 'auth.json' });
});
```

#### CI/CD Failures

```bash
# Issue: Tests pass locally but fail in CI
# Solution 1: Match CI environment
docker run -it --rm mcr.microsoft.com/playwright:latest /bin/bash

# Solution 2: Enable debug logging in CI
DEBUG=pw:api npx playwright test

# Solution 3: Check for timing issues
# Use --workers=1 to run serially
npx playwright test --workers=1
```

#### Browser-Specific Issues

```typescript
// Issue: Test fails in specific browser
// Solution: Conditional logic for browser-specific behavior
test('video playback', async ({ page, browserName }) => {
  await page.goto('/courses/123/lessons/1');

  if (browserName === 'webkit') {
    // Safari-specific handling
    await page.click('[data-testid="unmute-button"]');
  }

  await page.click('[data-testid="play-button"]');
});
```

### Debug Commands

```bash
# Show browser during test execution
npx playwright test --headed

# Run specific test file
npx playwright test tests/e2e/courses/course-creation.spec.ts

# Run tests with specific tag
npx playwright test --grep @smoke

# Generate test report
npx playwright show-report

# Update visual snapshots
npx playwright test --update-snapshots

# Run tests in specific browser
npx playwright test --project=chromium

# Show verbose output
npx playwright test --reporter=list

# Run with debug inspector
PWDEBUG=1 npx playwright test
```

### Logging and Diagnostics

```typescript
// Enable detailed logging
test.use({
  trace: 'on',
  screenshot: 'on',
  video: 'on',
});

// Custom logging
test('debug logging example', async ({ page }, testInfo) => {
  console.log(`Test: ${testInfo.title}`);
  console.log(`Project: ${testInfo.project.name}`);

  page.on('request', request => {
    console.log(`Request: ${request.method()} ${request.url()}`);
  });

  page.on('response', response => {
    console.log(`Response: ${response.status()} ${response.url()}`);
  });

  await page.goto('/courses');
});
```

### Performance Issues

```typescript
// Issue: Slow test execution
// Solution 1: Disable unnecessary features
test.use({
  video: 'off',
  screenshot: 'only-on-failure',
});

// Solution 2: Use API for non-UI operations
test.beforeEach(async ({ request }) => {
  await request.post('/api/seed-data');
});

// Solution 3: Optimize waiting
// Don't wait for networkidle unless necessary
await page.goto('/courses', { waitUntil: 'domcontentloaded' });
```

---

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Web Accessibility Testing](https://www.w3.org/WAI/test-evaluate/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Contributing

When adding new E2E tests:

1. Follow the Page Object Model pattern
2. Add tests for both happy paths and error cases
3. Include accessibility checks
4. Update this documentation
5. Ensure tests pass in all browsers
6. Add appropriate test tags (@smoke, @regression, etc.)
7. Document any new fixtures or utilities
