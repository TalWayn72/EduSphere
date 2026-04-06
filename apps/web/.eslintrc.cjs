module.exports = {
  root: true,
  extends: ['@edusphere/eslint-config'],
  env: {
    browser: true,
    es2022: true,
  },
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
  },
};
