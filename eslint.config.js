import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import prettier from 'eslint-config-prettier'

/**
 * ESLint 9 flat config.
 * - `recommended` của ESLint: lỗi JS cơ bản, biến không dùng, code không tới được…
 * - `react-hooks`: thứ tự hook, dependency của useEffect
 * - `jsx-a11y`: lỗi accessibility trong JSX
 * - `prettier` đặt cuối để tắt các rule xung đột định dạng (Prettier lo phần đó)
 */
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'original-build/**', 'web/**'],
  },

  js.configs.recommended,

  jsxA11y.flatConfigs.recommended,

  {
    files: ['**/*.{js,jsx}'],
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
      'react-refresh': reactRefresh,
      react,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Đánh dấu component dùng trong JSX là "đã dùng"
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off',

      // Không bắt buộc propTypes (dự án dùng JS thuần, chưa có TypeScript)
      'react/prop-types': 'off',

      // Vite Fast Refresh: file chỉ nên export component
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Cho phép bỏ qua biến/bam số bằng tiền tố _
      'no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      // Không chặn debug, nhưng cảnh báo để không lọt vào production
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Bắt lỗi so sánh lỏng và biến toàn cục ngoài ý muốn
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },

  {
    files: ['*.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  prettier,
]
