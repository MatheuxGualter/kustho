import { act, fireEvent, screen } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Text } from 'react-native';

import { usePreferences } from '@/lib/preferences';
import { renderWithTheme } from '@/test/render';

import { AppLockGate } from '../AppLockGate';

jest.mock('expo-local-authentication', () => ({
  authenticateAsync: jest.fn(),
  getEnrolledLevelAsync: jest.fn(async () => 2),
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2 },
}));
const authenticate = LocalAuthentication.authenticateAsync as jest.Mock;

afterEach(async () => {
  await act(() => usePreferences.setState({ lockEnabled: false }));
});

it('sem bloqueio, mostra o conteúdo direto', async () => {
  await renderWithTheme(
    <AppLockGate>
      <Text>conteúdo</Text>
    </AppLockGate>,
  );
  expect(screen.queryByText('Kustho bloqueado')).toBeNull();
  expect(authenticate).not.toHaveBeenCalled();
});

it('com bloqueio, cobre o conteúdo até autenticar', async () => {
  await act(() => usePreferences.setState({ lockEnabled: true }));
  authenticate.mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true });
  await renderWithTheme(
    <AppLockGate>
      <Text>conteúdo</Text>
    </AppLockGate>,
  );
  expect(await screen.findByText('Não foi possível confirmar. Tente de novo.')).toBeOnTheScreen();
  expect(screen.getByText('Kustho bloqueado')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Desbloquear' }));
  await act(async () => {});
  expect(screen.queryByText('Kustho bloqueado')).toBeNull();
});
