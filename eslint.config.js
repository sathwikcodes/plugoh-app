const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.expo/**', '**/coverage/**', 'services/**/vitest.config.ts'],
  },
  {
    files: ['services/**/*.ts', 'packages/**/*.ts', 'apps/mobile/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked, ...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-deprecated': 'off',
    },
  },
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    rules: {
      // Numbers and booleans in template literals are idiomatic in RN (styles, currency, etc.)
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }],
      // Async event handlers (onPress, onChangeText) are standard RN pattern
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
    },
  },
  {
    // services/api uses raw SQL via a Row = Record<string,any> pattern; unsafe-* rules are impractical here
    files: ['services/api/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }],
    },
  },
  {
    // Test files are excluded from the backend tsconfig (build artifact separation); disable rules
    // that require strictNullChecks project info and sync mock helpers marked async
    files: ['services/api/src/**/*.test.ts', 'services/api/src/testing/**/*.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-useless-default-assignment': 'off',
    },
  },
);
