import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', '.vite/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
        node: true,
      },
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
    },
  },
];
