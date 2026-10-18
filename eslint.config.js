// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: [
      'dist/*',
      'android/*',
      'ios/*',
      'src/db/migrations/*',
      'expo-env.d.ts',
      'src/ui/banks/logos.generated.ts',
    ],
  },
  {
    // Cores só a partir de src/ui/tokens.ts.
    files: ['src/**/*.{ts,tsx}'],
    // Exceções: os tokens e as cores oficiais das marcas dos bancos (dados, não tema).
    ignores: ['src/ui/tokens.ts', 'src/ui/banks/**', 'src/**/__tests__/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
          message: 'Use as cores de src/ui/tokens.ts (classes do Tailwind ou useTheme()).',
        },
      ],
    },
  },
]);
