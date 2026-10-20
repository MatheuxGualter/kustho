import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHandler, type NativeEventSubscription } from 'react-native';

import { usePreferences } from '@/lib/preferences';
import { renderWithTheme } from '@/test/render';

import { OnboardingScreen } from '../OnboardingScreen';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
  Stack: { Screen: () => null },
  usePreventRemove: () => () => {},
}));

type HardwareBack = Parameters<typeof BackHandler.addEventListener>[1];

let onHardwareBack: HardwareBack | undefined;

beforeEach(() => {
  onHardwareBack = undefined;
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    onHardwareBack = handler;
    return { remove: jest.fn() } as unknown as NativeEventSubscription;
  });
  jest.mocked(router.back).mockClear();
  jest.mocked(router.replace).mockClear();
  usePreferences.setState({ onboardingDone: false, displayName: null });
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function advance(times: number) {
  for (let i = 0; i < times; i += 1) {
    await fireEvent.press(screen.getByRole('button', { name: 'Avançar' }));
  }
}

it('não oferece pular as boas-vindas', async () => {
  await renderWithTheme(<OnboardingScreen />);
  expect(screen.queryByRole('button', { name: 'Agora não' })).toBeNull();
});

it('voltar no primeiro passo não sai das boas-vindas', async () => {
  await renderWithTheme(<OnboardingScreen />);
  expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
  expect(router.back).not.toHaveBeenCalled();
  expect(screen.getByText('Bem-vindo ao Kustho')).toBeOnTheScreen();

  await act(() => {
    expect(onHardwareBack?.({} as never)).toBe(true);
  });
  expect(router.back).not.toHaveBeenCalled();
  expect(screen.getByText('Bem-vindo ao Kustho')).toBeOnTheScreen();
});

it('voltar no segundo passo retorna ao anterior', async () => {
  await renderWithTheme(<OnboardingScreen />);
  await advance(1);
  expect(screen.getByText('Lance em segundos')).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
  expect(screen.getByText('Bem-vindo ao Kustho')).toBeOnTheScreen();
  expect(router.back).not.toHaveBeenCalled();

  await advance(1);
  await act(() => {
    expect(onHardwareBack?.({} as never)).toBe(true);
  });
  expect(screen.getByText('Bem-vindo ao Kustho')).toBeOnTheScreen();
  expect(router.back).not.toHaveBeenCalled();
});

it('pede o nome no quarto passo e segue para a primeira conta', async () => {
  await renderWithTheme(<OnboardingScreen />);
  await advance(3);
  expect(screen.getByText('Como podemos te chamar?')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Começar' })).toBeDisabled();

  await fireEvent.changeText(screen.getByLabelText('Nome'), '   ');
  expect(screen.getByRole('button', { name: 'Começar' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Começar' }));
  expect(router.replace).not.toHaveBeenCalled();

  await fireEvent.changeText(screen.getByLabelText('Nome'), '  Ana  ');
  await fireEvent.press(screen.getByRole('button', { name: 'Começar' }));
  expect(usePreferences.getState().displayName).toBe('Ana');
  expect(usePreferences.getState().onboardingDone).toBe(true);
  expect(router.replace).toHaveBeenCalledWith('/conta/nova');
  expect(router.back).not.toHaveBeenCalled();
});

it('se as boas-vindas já terminaram, só atualiza o nome', async () => {
  usePreferences.setState({ onboardingDone: true, displayName: 'Ana' });
  await renderWithTheme(<OnboardingScreen />);
  await advance(3);
  expect(screen.getByDisplayValue('Ana')).toBeOnTheScreen();

  await fireEvent.changeText(screen.getByLabelText('Nome'), 'Lia');
  await fireEvent.press(screen.getByRole('button', { name: 'Começar' }));
  expect(usePreferences.getState().displayName).toBe('Lia');
  expect(usePreferences.getState().onboardingDone).toBe(true);
  expect(router.back).toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});
