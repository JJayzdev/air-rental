import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import nextPlugin from '@next/eslint-plugin-next'
import prettier from 'eslint-config-prettier'

/**
 * ESLint 9 flat config cho Next.js + TypeScript.
 */
export default tseslint.config(
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    // Đăng ký plugin ở phạm vi toàn cục để `next build` nhận ra cấu hình ESLint
    // (Next dò plugin qua config của package.json, không chỉ file .ts/.tsx).
    plugins: { '@next/next': nextPlugin },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      react,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      // React 19 dùng JSX transform mới, không cần import React
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off',

      // Đã có TypeScript kiểm tra props
      'react/prop-types': 'off',

      // TypeScript unused vars
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Không chặn debug, nhưng cảnh báo để không lọt vào production
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['*.config.{js,ts}', 'next.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  prettier,
)
