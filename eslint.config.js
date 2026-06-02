import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist/**', 'node_modules/**', '**/*.js', '**/*.mjs'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            }],
            '@typescript-eslint/consistent-type-imports': ['warn', {
                prefer: 'type-imports',
                fixStyle: 'separate-type-imports',
            }],
            'no-debugger': 'error',
            'no-unreachable': 'error',
            'eqeqeq': ['error', 'smart'],
        },
    },
    {
        files: ['src/**/*.test.ts'],
        rules: {
            '@typescript-eslint/no-unused-vars': 'off',
        },
    },
);
