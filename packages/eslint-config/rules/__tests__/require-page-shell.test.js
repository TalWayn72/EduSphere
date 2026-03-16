/**
 * Tests for require-page-shell ESLint rule.
 */
'use strict';

const { RuleTester } = require('eslint');
const rule = require('../require-page-shell');

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-page-shell', rule, {
  valid: [
    // Already imports PageShell — inline patterns are allowed.
    {
      code: `
        import { PageShell } from '@/components/PageShell';
        export default function HomePage() {
          return <PageShell size="md"><div className="max-w-4xl mx-auto">ok</div></PageShell>;
        }
      `,
      filename: 'src/pages/Home.tsx',
    },
    // No inline pattern — no issue.
    {
      code: `
        export default function AboutPage() {
          return <div className="flex items-center p-4">About</div>;
        }
      `,
      filename: 'src/pages/About.tsx',
    },
    // Non-page file — rule does not apply.
    {
      code: `
        export default function Card() {
          return <div className="max-w-4xl mx-auto">Content</div>;
        }
      `,
      filename: 'src/components/Card.tsx',
    },
    // Non-tsx file — rule does not apply.
    {
      code: `
        const x = 'max-w-4xl mx-auto';
      `,
      filename: 'src/pages/constants.ts',
    },
    // max-w-3xl (not in pattern list) — allowed.
    {
      code: `
        export default function NarrowPage() {
          return <div className="max-w-3xl mx-auto">Narrow</div>;
        }
      `,
      filename: 'src/pages/Narrow.tsx',
    },
  ],

  invalid: [
    // max-w-4xl mx-auto without PageShell import.
    {
      code: `
        export default function SettingsPage() {
          return <div className="max-w-4xl mx-auto p-6">Settings</div>;
        }
      `,
      filename: 'src/pages/Settings.tsx',
      errors: [{ messageId: 'usePageShell' }],
    },
    // max-w-7xl mx-auto.
    {
      code: `
        export default function DashboardPage() {
          return <div className="max-w-7xl mx-auto">Dashboard</div>;
        }
      `,
      filename: 'src/pages/Dashboard.tsx',
      errors: [{ messageId: 'usePageShell' }],
    },
    // max-w-screen-xl mx-auto.
    {
      code: `
        export default function WideLayout() {
          return <div className="max-w-screen-xl mx-auto">Wide</div>;
        }
      `,
      filename: 'src/pages/WideLayout.tsx',
      errors: [{ messageId: 'usePageShell' }],
    },
    // Template literal with inline pattern.
    {
      code: `
        export default function TplPage() {
          return <div className={\`max-w-5xl mx-auto\`}>Content</div>;
        }
      `,
      filename: 'src/pages/TplPage.tsx',
      errors: [{ messageId: 'usePageShell' }],
    },
    // Reversed order: mx-auto max-w-6xl.
    {
      code: `
        export default function ReversedPage() {
          return <div className="mx-auto max-w-6xl">Content</div>;
        }
      `,
      filename: 'src/pages/ReversedPage.tsx',
      errors: [{ messageId: 'usePageShell' }],
    },
  ],
});
