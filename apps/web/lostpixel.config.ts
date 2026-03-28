import type { CustomProjectConfig } from 'lost-pixel';

const config: CustomProjectConfig = {
  storybookShots: {
    storybookUrl: './storybook-static',
  },

  pageShots: {
    pages: [
      { path: '/', name: 'home' },
      { path: '/login', name: 'login' },
      { path: '/dashboard', name: 'dashboard' },
      { path: '/courses', name: 'courses' },
      { path: '/courses/1', name: 'course-detail' },
      { path: '/search', name: 'search' },
      { path: '/knowledge-graph', name: 'knowledge-graph' },
      { path: '/profile', name: 'profile' },
      { path: '/settings', name: 'settings' },
      { path: '/admin', name: 'admin' },
      { path: '/admin/compliance', name: 'admin-compliance' },
      { path: '/admin/lti', name: 'admin-lti' },
      { path: '/admin/scim', name: 'admin-scim' },
      { path: '/exams', name: 'exams' },
      { path: '/exams/item-bank', name: 'exams-item-bank' },
      { path: '/exams/blueprint', name: 'exams-blueprint' },
      { path: '/social', name: 'social' },
      { path: '/social/challenges', name: 'social-challenges' },
      { path: '/analytics', name: 'analytics' },
      { path: '/analytics/course', name: 'analytics-course' },
      { path: '/content-import', name: 'content-import' },
      { path: '/certificates', name: 'certificates' },
      { path: '/onboarding', name: 'onboarding' },
      { path: '/assessments', name: 'assessments' },
      { path: '/portal-builder', name: 'portal-builder' },
      { path: '/notifications', name: 'notifications' },
      { path: '/calendar', name: 'calendar' },
      { path: '/help', name: 'help' },
      { path: '/about', name: 'about' },
      { path: '/pricing', name: 'pricing' },
    ],
    baseUrl: 'http://localhost:5176',
  },

  threshold: 0.05,
  generateOnly: true,
  failOnDifference: true,

  imagePathBaseline: '.lostpixel/baseline/',
  imagePathCurrent: '.lostpixel/current/',
  imagePathDifference: '.lostpixel/difference/',
};

export default config;
