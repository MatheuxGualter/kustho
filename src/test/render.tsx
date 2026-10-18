import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '@/ui/theme';

/** Renderiza dentro do ThemeProvider, como no app (assíncrono no RNTL 14). */
export function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
