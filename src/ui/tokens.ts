/**
 * Design tokens do Kustho — única fonte de cores, tipografia, espaçamento, raios e movimento.
 *
 * Nenhum outro arquivo deve conter cores ou medidas soltas: telas usam as classes do
 * Tailwind (geradas a partir daqui em `tailwind.config.ts`) ou `useTheme()`.
 *
 * Valores provisórios do kickoff da Fase 0; a trilha B fecha a paleta final e valida
 * o contraste AA nos dois temas.
 */

export type ColorScheme = 'light' | 'dark';

export const colorTokenNames = [
  'bg',
  'surface',
  'surface-raised',
  'border',
  'text',
  'text-muted',
  'brand',
  'on-brand',
  'income',
  'expense',
  'warning',
  'info',
] as const;

export type ColorToken = (typeof colorTokenNames)[number];

export const colors: Record<ColorScheme, Record<ColorToken, string>> = {
  light: {
    bg: '#F5F8F7',
    surface: '#FFFFFF',
    'surface-raised': '#FAFBFB',
    border: '#D9E2DF',
    text: '#0F1A18',
    'text-muted': '#56645F',
    brand: '#0F766E',
    'on-brand': '#FFFFFF',
    income: '#15803D',
    expense: '#DC2626',
    warning: '#B45309',
    info: '#2563EB',
  },
  dark: {
    bg: '#0A1110',
    surface: '#121B1A',
    'surface-raised': '#1B2725',
    border: '#2A3835',
    text: '#E8EFED',
    'text-muted': '#9AABA6',
    brand: '#2DD4BF',
    'on-brand': '#042F2E',
    income: '#4ADE80',
    expense: '#F87171',
    warning: '#FBBF24',
    info: '#60A5FA',
  },
};

/** Paleta de 10 cores que o usuário escolhe para contas e cartões. Iguais nos dois temas. */
export const accentPalette = [
  '#0F766E',
  '#7C3AED',
  '#DB2777',
  '#EA580C',
  '#CA8A04',
  '#16A34A',
  '#0284C7',
  '#4F46E5',
  '#475569',
  '#9F1239',
] as const;

export type AccentColor = (typeof accentPalette)[number];

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Escala tipográfica (px). `display` (36) é exclusivo do saldo. */
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 20,
  xl: 28,
  display: 36,
} as const;

export const lineHeight: Record<keyof typeof fontSize, number> = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 34,
  display: 42,
};

/** Grade de 4. A chave segue a numeração do Tailwind (n × 4 px): `p-4` = 16. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
} as const;

export const radius = {
  none: 0,
  input: 8,
  card: 12,
  sheet: 20,
  full: 9999,
} as const;

/** Tamanhos fixos de elementos (dp): `h-fab`, `w-fab`. */
export const sizes = {
  fab: 48,
} as const;

/** Alvo de toque mínimo (dp). */
export const touchTarget = 44;

/** Durações em ms; animações usam springs e respeitam "reduzir movimento". */
export const motion = {
  fast: 150,
  base: 200,
  slow: 250,
} as const;

/** Faixas de largura (dp) para layout responsivo. */
export const breakpoints = {
  /** `< 360` é compacta. */
  standard: 360,
  /** `≥ 600` é expandida (tablet, dobrável aberto): lista + detalhe. */
  expanded: 600,
} as const;
