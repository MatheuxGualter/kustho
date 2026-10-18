import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { vars } from 'nativewind';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useColorScheme, View } from 'react-native';

import { usePreferences } from '@/lib/preferences';

import { colors, type ColorScheme, colorTokenNames, type ColorToken } from './tokens';

/** `#0F766E` → `15 118 110`, formato que o Tailwind usa com `<alpha-value>`. */
export function hexToRgbChannels(hex: string): string {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

const cssVars = Object.fromEntries(
  (['light', 'dark'] as const).map((scheme) => [
    scheme,
    vars(
      Object.fromEntries(
        colorTokenNames.map((name) => [`--color-${name}`, hexToRgbChannels(colors[scheme][name])]),
      ),
    ),
  ]),
) as Record<ColorScheme, ReturnType<typeof vars>>;

export type Theme = {
  scheme: ColorScheme;
  /** Cores em hex, para o que não aceita `className` (ícones, gráficos, status bar). */
  colors: Record<ColorToken, string>;
};

const ThemeContext = createContext<Theme | null>(null);

export function useResolvedScheme(): ColorScheme {
  const preference = usePreferences((s) => s.theme);
  const system = useColorScheme();
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useResolvedScheme();
  const theme = useMemo<Theme>(() => ({ scheme, colors: colors[scheme] }), [scheme]);

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.brand,
        background: theme.colors.bg,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.expense,
      },
    };
  }, [scheme, theme]);

  return (
    <ThemeContext.Provider value={theme}>
      <NavigationThemeProvider value={navigationTheme}>
        <View style={[{ flex: 1 }, cssVars[scheme]]}>{children}</View>
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme precisa estar dentro de <ThemeProvider>');
  return theme;
}
