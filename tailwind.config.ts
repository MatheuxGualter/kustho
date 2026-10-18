import type { Config } from 'tailwindcss';

import {
  colorTokenNames,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
  sizes,
  touchTarget,
} from './src/ui/tokens';

// Cores apontam para variáveis CSS definidas por tema em `src/ui/theme.tsx`,
// então `bg-surface` já troca sozinho entre claro e escuro.
const themedColors = Object.fromEntries(
  colorTokenNames.map((name) => [name, `rgb(var(--color-${name}) / <alpha-value>)`]),
);

const px = (values: Record<string | number, number>) =>
  Object.fromEntries(Object.entries(values).map(([k, v]) => [k, `${v}px`]));

export default {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // Substitui (não estende) as escalas padrão: nada fora dos tokens.
    colors: { transparent: 'transparent', ...themedColors },
    spacing: px(spacing),
    borderRadius: px(radius),
    fontSize: Object.fromEntries(
      Object.entries(fontSize).map(([k, v]) => [
        k,
        [`${v}px`, { lineHeight: `${lineHeight[k as keyof typeof lineHeight]}px` }],
      ]),
    ),
    // Inter tem um arquivo por peso; o peso vem da família (`font-semibold`).
    fontFamily: Object.fromEntries(Object.entries(fontFamily).map(([k, v]) => [k, [v]])),
    fontWeight: {},
    extend: {
      minHeight: { touch: `${touchTarget}px` },
      minWidth: { touch: `${touchTarget}px` },
      height: px(sizes),
      width: px(sizes),
    },
  },
  plugins: [],
} satisfies Config;
