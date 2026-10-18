import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ServicesProvider } from '@/services';
import { createFakeServices, createFakeStore } from '@/services/fakes';
import { renderWithTheme } from '@/test/render';
import { breakpoints } from '@/ui/tokens';

import { TransactionsScreen } from '../TransactionsScreen';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { back: jest.fn(), push: jest.fn() },
  Stack: { Screen: () => null },
}));

// O seletor de mês usa gestos nativos que o Jest não simula; aqui ele não importa.
jest.mock('@/ui/components/MonthSwitcher', () => ({ MonthSwitcher: () => null }));

const window = { width: 0, height: 900, scale: 2, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => window,
}));
const withWidth = (width: number) => {
  window.width = width;
};

const setup = async () => {
  const store = createFakeStore();
  await renderWithTheme(
    <ServicesProvider services={createFakeServices(store)}>
      <TransactionsScreen />
    </ServicesProvider>,
  );
  await screen.findAllByText('Salário');
  return store;
};

afterEach(() => jest.clearAllMocks());

it('no celular, tocar num lançamento abre a tela de edição', async () => {
  withWidth(breakpoints.standard);
  await setup();
  await fireEvent.press(screen.getAllByText('Salário')[0]);
  expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/lancamento\//));
  expect(screen.queryByText('Escolha um lançamento')).toBeNull();
});

it('na tela larga, mostra a lista e edita no painel ao lado', async () => {
  withWidth(breakpoints.expanded + 100);
  await setup();
  expect(screen.getByText('Escolha um lançamento')).toBeTruthy();
  await fireEvent.press(screen.getAllByText('Salário')[0]);
  expect(router.push).not.toHaveBeenCalled();
  expect(await screen.findByDisplayValue('Salário')).toBeTruthy();
  expect(screen.queryByText('Escolha um lançamento')).toBeNull();
});
