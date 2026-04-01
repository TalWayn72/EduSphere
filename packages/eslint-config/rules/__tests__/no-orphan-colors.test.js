/**
 * Tests for no-orphan-colors ESLint rule.
 */
'use strict';

const { RuleTester } = require('eslint');
const rule = require('../no-orphan-colors');

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-orphan-colors', rule, {
  valid: [
    // Has both light and dark variant.
    {
      code: '<div className="bg-white dark:bg-gray-900" />',
      filename: 'src/pages/Home.tsx',
    },
    // Semantic tokens — no dark: needed.
    {
      code: '<div className="bg-background text-foreground" />',
      filename: 'src/pages/Home.tsx',
    },
    // More semantic tokens.
    {
      code: '<div className="bg-muted text-muted-foreground border-border" />',
      filename: 'src/pages/Home.tsx',
    },
    // dark: class itself should not trigger.
    {
      code: '<div className="dark:bg-gray-800" />',
      filename: 'src/pages/Home.tsx',
    },
    // Template literal with both variants.
    {
      code: '<div className={`bg-slate-100 dark:bg-slate-800`} />',
      filename: 'src/pages/Home.tsx',
    },
    // Test files are exempt.
    {
      code: '<div className="bg-white" />',
      filename: 'src/pages/Home.test.tsx',
    },
    // Spec files are exempt.
    {
      code: '<div className="bg-white" />',
      filename: 'src/pages/Home.spec.tsx',
    },
    // bg-primary is semantic.
    {
      code: '<div className="bg-primary text-primary-foreground" />',
      filename: 'src/pages/Home.tsx',
    },
    // Non-color class — no issue.
    {
      code: '<div className="flex items-center p-4" />',
      filename: 'src/pages/Home.tsx',
    },
    // text with dark counterpart.
    {
      code: '<div className="text-gray-700 dark:text-gray-200" />',
      filename: 'src/pages/Home.tsx',
    },
    // border with dark counterpart.
    {
      code: '<div className="border-gray-200 dark:border-gray-700" />',
      filename: 'src/pages/Home.tsx',
    },
  ],

  invalid: [
    // bg-white without dark: variant.
    {
      code: '<div className="bg-white" />',
      filename: 'src/pages/Home.tsx',
      errors: [
        { messageId: 'missingDark', data: { cls: 'bg-white', prefix: 'bg' } },
      ],
    },
    // text-gray-900 without dark: variant.
    {
      code: '<div className="text-gray-900" />',
      filename: 'src/pages/Home.tsx',
      errors: [
        {
          messageId: 'missingDark',
          data: { cls: 'text-gray-900', prefix: 'text' },
        },
      ],
    },
    // Two orphan classes — two warnings.
    {
      code: '<div className="bg-white text-gray-700" />',
      filename: 'src/pages/Home.tsx',
      errors: [
        { messageId: 'missingDark', data: { cls: 'bg-white', prefix: 'bg' } },
        {
          messageId: 'missingDark',
          data: { cls: 'text-gray-700', prefix: 'text' },
        },
      ],
    },
    // bg-slate-100 without dark variant.
    {
      code: '<div className="bg-slate-100" />',
      filename: 'src/pages/Home.tsx',
      errors: [
        {
          messageId: 'missingDark',
          data: { cls: 'bg-slate-100', prefix: 'bg' },
        },
      ],
    },
    // border-gray-300 without dark variant.
    {
      code: '<div className="border-gray-300" />',
      filename: 'src/pages/Home.tsx',
      errors: [
        {
          messageId: 'missingDark',
          data: { cls: 'border-gray-300', prefix: 'border' },
        },
      ],
    },
    // Template literal with orphan.
    {
      code: '<div className={`bg-gray-50 p-4`} />',
      filename: 'src/pages/Home.tsx',
      errors: [
        { messageId: 'missingDark', data: { cls: 'bg-gray-50', prefix: 'bg' } },
      ],
    },
    // Expression container with string literal.
    {
      code: '<div className={"text-slate-600"} />',
      filename: 'src/pages/Home.tsx',
      errors: [
        {
          messageId: 'missingDark',
          data: { cls: 'text-slate-600', prefix: 'text' },
        },
      ],
    },
  ],
});
