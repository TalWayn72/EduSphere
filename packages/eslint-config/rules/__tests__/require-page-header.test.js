/**
 * Tests for require-page-header ESLint rule.
 */
'use strict';

const { RuleTester } = require('eslint');
const rule = require('../require-page-header');

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-page-header', rule, {
  valid: [
    // Has <PageHeader>.
    {
      code: `
        export default function HomePage() {
          return <div><PageHeader title="Home" /></div>;
        }
      `,
      filename: 'src/pages/Home.tsx',
    },
    // Has raw <h1>.
    {
      code: `
        export default function AboutPage() {
          return <div><h1>About Us</h1></div>;
        }
      `,
      filename: 'src/pages/About.tsx',
    },
    // Has sr-only h1.
    {
      code: `
        export default function DashboardPage() {
          return <div><h1 className="sr-only">Dashboard</h1></div>;
        }
      `,
      filename: 'src/pages/Dashboard.tsx',
    },
    // Non-page file — rule does not apply.
    {
      code: `
        export default function Widget() {
          return <div>No heading needed</div>;
        }
      `,
      filename: 'src/components/Widget.tsx',
    },
    // Exempt sub-component: filename contains "Card".
    {
      code: `
        export default function FeatureCard() {
          return <div>Card content</div>;
        }
      `,
      filename: 'src/pages/FeatureCard.tsx',
    },
    // Exempt sub-component: filename contains "Modal".
    {
      code: `
        export default function EditModal() {
          return <div>Modal content</div>;
        }
      `,
      filename: 'src/pages/EditModal.tsx',
    },
    // Non-tsx file — rule does not apply.
    {
      code: `
        export default function util() { return 42; }
      `,
      filename: 'src/pages/utils.ts',
    },
  ],

  invalid: [
    // Page file with no h1 or PageHeader.
    {
      code: `
        export default function SettingsPage() {
          return <div><p>Settings content</p></div>;
        }
      `,
      filename: 'src/pages/Settings.tsx',
      errors: [{ messageId: 'missingHeader' }],
    },
    // Page file with only h2 (not h1).
    {
      code: `
        export default function ProfilePage() {
          return <div><h2>Profile</h2></div>;
        }
      `,
      filename: 'src/pages/Profile.tsx',
      errors: [{ messageId: 'missingHeader' }],
    },
    // Nested pages directory.
    {
      code: `
        export default function AdminUsers() {
          return <div><span>Users list</span></div>;
        }
      `,
      filename: 'src/pages/admin/Users.tsx',
      errors: [{ messageId: 'missingHeader' }],
    },
  ],
});
