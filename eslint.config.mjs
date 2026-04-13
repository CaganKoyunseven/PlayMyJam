import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import eslintPluginPrettier from 'eslint-plugin-prettier';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  {
    plugins: {
      prettier: eslintPluginPrettier,
    },
    settings: {
      react: { version: '19' },
    },
    rules: {
      'import/no-anonymous-default-export': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react/self-closing-comp': 'error',
      'prettier/prettier': 'error',
      'object-shorthand': 'error',
      quotes: ['error', 'single', { avoidEscape: true }],
      'react/jsx-curly-brace-presence': [
        'error',
        { props: 'never', children: 'never' },
      ],
      'import/order': [
        'error',
        {
          pathGroups: [
            { pattern: 'react', group: 'builtin', position: 'after' },
            { pattern: 'next/*', group: 'external', position: 'before' },
            { pattern: '@/**', group: 'internal', position: 'after' },
          ],
          groups: [
            'builtin',
            'external',
            'type',
            'object',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          pathGroupsExcludedImportTypes: ['react', 'next'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
]);
