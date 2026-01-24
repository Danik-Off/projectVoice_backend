import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            'utils/swagger/swagger-output.json',
            'package-lock.json',
        ],
    },
    // Базовые правила JS
    js.configs.recommended,
    
    // Стилистические правила (замена старым правилам ESLint)
    stylistic.configs.recommended,
    
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        plugins: {
            import: importPlugin,
            promise: promisePlugin,
            prettier: prettierPlugin,
            '@stylistic': stylistic,
        },
        rules: {
            // Строгость
            'no-unused-vars': ['error', { argsIgnorePattern: '^next$' }],
            'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
            'eqeqeq': ['error', 'always'],
            'curly': ['error', 'all'],
            'no-var': 'error',
            'prefer-const': 'error',
            'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
            
            // Импорты
            'import/order': ['error', {
                'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                'newlines-between': 'always',
                'alphabetize': { order: 'asc', caseInsensitive: true }
            }],
            
            // Стилистика (через @stylistic)
            '@stylistic/indent': ['error', 4],
            '@stylistic/quotes': ['error', 'single'],
            '@stylistic/semi': ['error', 'always'],
            '@stylistic/comma-dangle': ['error', 'always-multiline'],
            '@stylistic/arrow-parens': ['error', 'always'],
            '@stylistic/brace-style': ['error', '1tbs'],
            '@stylistic/object-curly-spacing': ['error', 'always'],
            
            // Преттиер (интеграция)
            'prettier/prettier': 'error',
        },
    },
    
    // Исключения для скриптов и инструментов (разрешаем console.log)
    {
        files: [
            'scripts/**/*.js',
            'utils/swagger/*.js',
            'migrations/*.js',
            'index.js',
            'models/index.js',
            'middleware/*.js',
            'modules/webrtc/*.js',
            'routes/*.js',
            'config/*.js',
        ],
        rules: {
            'no-console': 'off',
        },
    },
    
    // Отключаем правила, которые конфликтуют с Prettier
    prettierConfig,
];
