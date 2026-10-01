import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.output/**', '.wxt/**', 'node_modules/**', 'coverage/**', 'scripts/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        /*
         * Type-aware linting. It costs a slower run but buys rules that catch real
         * bugs, such as an unhandled case in a switch over a union — which is how
         * the note status and plan mappings are kept honest.
         */
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,

      // House rules that keep the codebase consistent as it grows.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      // A `default` that handles the remaining union members is a legitimate way
      // to write these mappings; switches *without* a default are still checked.
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],

      // `console.warn`/`error` are intentional diagnostics; `log` is not.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': ['error', 'properties'],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}', '*.config.ts'],
    rules: {
      // Tests deal in deliberately malformed input.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'no-console': 'off',
    },
  },
  prettier,
);
