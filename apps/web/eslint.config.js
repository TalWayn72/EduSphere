import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import securityPlugin from 'eslint-plugin-security';
import noUnsanitizedPlugin from 'eslint-plugin-no-unsanitized';

export default [
  js.configs.recommended,
  securityPlugin.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        Buffer: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLParagraphElement: 'readonly',
        HTMLHeadingElement: 'readonly',
        HTMLVideoElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        WheelEvent: 'readonly',
        Element: 'readonly',
        SVGElement: 'readonly',
        SVGSVGElement: 'readonly',
        React: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        clearInterval: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'no-unsanitized': noUnsanitizedPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...typescript.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      // XSS prevention — block unsanitized innerHTML / outerHTML writes
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',
    },
  },
];
