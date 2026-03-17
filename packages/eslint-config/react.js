const edusphereDesignSystemRules = require('./rules');

module.exports = {
  extends: [
    './index.js',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: ['react', 'react-hooks', 'edusphere-design-system'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'edusphere-design-system/no-orphan-colors': 'warn',
    'edusphere-design-system/require-page-header': 'warn',
    'edusphere-design-system/require-page-shell': 'warn',
  },
};
