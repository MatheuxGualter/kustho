import { fireEvent, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { renderWithTheme } from '@/test/render';

import { TabBar } from '../TabBar';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const names = ['index', 'lancamentos', 'pendentes', 'cartoes', 'contas', 'mais'];
const titles = ['Início', 'Lançamentos', 'Pendentes', 'Cartões', 'Contas', 'Mais'];

function props(index = 0): BottomTabBarProps {
  const routes = names.map((name) => ({ key: `${name}-key`, name }));
  const descriptors = Object.fromEntries(
    routes.map((r, i) => [
      r.key,
      { options: { title: titles[i], tabBarBadge: r.name === 'pendentes' ? 3 : undefined } },
    ]),
  );
  return {
    state: { index, routes },
    descriptors,
    emitter: { emit: jest.fn(() => ({ defaultPrevented: false })) },
    navigateToTab: jest.fn(),
  } as unknown as BottomTabBarProps;
}

it('mostra só ícones: os nomes ficam no rótulo de acessibilidade', async () => {
  await renderWithTheme(<TabBar {...props()} />);
  expect(screen.queryByText('Lançamentos')).toBeNull();
  expect(screen.getByRole('tab', { name: 'Lançamentos' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Pendentes, 3 novas' })).toBeTruthy();
  expect(screen.getByText('3')).toBeTruthy();
});

it('o + fica no meio, com três abas de cada lado', async () => {
  await renderWithTheme(<TabBar {...props()} />);
  const order = screen
    .getAllByRole(/tab|button/)
    .map((el) => el.props.accessibilityLabel as string);
  expect(order.indexOf('Novo lançamento')).toBe(3);
});

it('tocar numa aba navega', async () => {
  const p = props();
  await renderWithTheme(<TabBar {...p} />);
  await fireEvent.press(screen.getByRole('tab', { name: 'Contas' }));
  expect(p.navigateToTab).toHaveBeenCalledWith('contas-key');
});
