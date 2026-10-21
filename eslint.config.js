import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'reports', 'test-results', 'playwright-report'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['scripts/**/*.mjs'], languageOptions: { globals: globals.node } },
  {
    files: ['src/**/*.ts'],
    rules: {
      // The library runs in the buyer's browser: Web APIs only, nothing from Node.
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['node:*'], message: 'Browser code: Web APIs only.' }] },
      ],
    },
  },
)
