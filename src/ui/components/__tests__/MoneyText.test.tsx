import { act, screen } from '@testing-library/react-native';

import { formatBRL } from '@/lib/money';
import { usePreferences } from '@/lib/preferences';
import { renderWithTheme } from '@/test/render';

import { MoneyText } from '../MoneyText';

afterEach(async () => {
  await act(() => usePreferences.setState({ hideValues: false }));
});

describe('MoneyText', () => {
  it('receita sempre com sinal +', async () => {
    await renderWithTheme(<MoneyText cents={4590} tone="income" testID="v" />);
    expect(screen.getByTestId('v')).toHaveTextContent(formatBRL(4590, { sign: 'always' }));
  });

  it('saída com sinal -', async () => {
    await renderWithTheme(<MoneyText cents={-4590} tone="expense" testID="v" />);
    expect(screen.getByTestId('v')).toHaveTextContent(formatBRL(-4590));
  });

  it('modo ocultar valores esconde o número e o rótulo de acessibilidade', async () => {
    await act(() => usePreferences.setState({ hideValues: true }));
    await renderWithTheme(<MoneyText cents={4590} testID="v" />);
    expect(screen.getByTestId('v')).toHaveTextContent(formatBRL(0, { hidden: true }));
    expect(screen.getByLabelText('Valor oculto')).toBeOnTheScreen();
  });

  it('hideable={false} ignora o modo ocultar', async () => {
    await act(() => usePreferences.setState({ hideValues: true }));
    await renderWithTheme(<MoneyText cents={4590} hideable={false} testID="v" />);
    expect(screen.getByTestId('v')).toHaveTextContent(formatBRL(4590));
  });
});
