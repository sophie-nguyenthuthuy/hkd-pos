/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    // TypeScript itself handles module resolution; eslint-plugin-import only
    // duplicates that check at the cost of a heavy resolver setup. We keep
    // `import/order` for style but skip the resolver-dependent rules.
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: ['dist', 'build', 'node_modules', '.turbo', '.expo', 'coverage', '**/*.config.js', '**/*.config.cjs'],
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: { 'no-console': 'off' },
    },
  ],
};
