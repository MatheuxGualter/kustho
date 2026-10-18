import { colors, type ColorScheme, type ColorToken } from '../tokens';

/** Razão de contraste WCAG 2.x entre duas cores hex. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, bl] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const AA_TEXT = 4.5;
const AA_LARGE = 3;

const backgrounds: ColorToken[] = ['bg', 'surface', 'surface-raised'];
const textTokens: ColorToken[] = ['text', 'text-muted', 'brand', 'expense', 'warning', 'info'];

describe.each<ColorScheme>(['light', 'dark'])('contraste AA no tema %s', (scheme) => {
  const c = colors[scheme];

  it.each(textTokens.flatMap((fg) => backgrounds.map((bg) => [fg, bg] as const)))(
    '%s sobre %s ≥ 4.5',
    (fg, bg) => {
      expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(AA_TEXT);
    },
  );

  it('on-brand sobre brand ≥ 4.5', () => {
    expect(contrast(c['on-brand'], c.brand)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  // O verde de receitas do plano (#16A34A) só passa AA para texto grande no tema claro;
  // por isso ele sempre vem com sinal "+" ou ícone. A trilha B decide o tom final.
  it.each(backgrounds)('income sobre %s ≥ 3 (texto grande)', (bg) => {
    expect(contrast(c.income, c[bg])).toBeGreaterThanOrEqual(AA_LARGE);
  });
});
