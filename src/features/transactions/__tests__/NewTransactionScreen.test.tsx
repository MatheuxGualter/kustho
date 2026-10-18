import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { today } from '@/lib/dates';
import { usePreferences } from '@/lib/preferences';
import { ServicesProvider } from '@/services';
import { createFakeServices, createFakeStore } from '@/services/fakes';
import { renderWithTheme } from '@/test/render';

import { NewTransactionScreen } from '../NewTransactionScreen';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { back: jest.fn(), push: jest.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({}),
}));

const setup = async () => {
  await act(() => usePreferences.setState({ lastOrigin: null }));
  const store = createFakeStore();
  await renderWithTheme(
    <ServicesProvider services={createFakeServices(store)}>
      <NewTransactionScreen />
    </ServicesProvider>,
  );
  await screen.findByText('Despesa');
  return store;
};

const type = async (keys: string[]) => {
  for (const key of keys) await fireEvent.press(screen.getByLabelText(key));
};

it('lança uma despesa com valor, descrição e a primeira conta', async () => {
  const store = await setup();
  const before = store.transactions.length;
  await type(['4', '5', '9', '0']);
  await fireEvent.changeText(screen.getByLabelText('Descrição'), 'Almoço');
  await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

  const created = store.transactions.at(-1)!;
  expect(store.transactions).toHaveLength(before + 1);
  expect(created).toMatchObject({
    kind: 'expense',
    amountCents: 4590,
    description: 'Almoço',
    date: today(),
    status: 'posted',
    accountId: store.accounts.find((a) => a.name === 'Carteira')!.id,
  });
  expect(router.back).toHaveBeenCalled();
  expect(usePreferences.getState().lastOrigin).toBe(`account:${created.accountId}`);
});

it('salvar fica desabilitado sem valor ou sem descrição', async () => {
  await setup();
  const save = screen.getByRole('button', { name: 'Salvar' });
  expect(save).toBeDisabled();
  await type(['1', '0']);
  expect(save).toBeDisabled();
  expect(screen.getByText('Escreva uma descrição')).toBeOnTheScreen();
});

it('receita não oferece cartões como destino', async () => {
  await setup();
  expect(screen.getByText('Nubank Roxinho · cartão')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('radio', { name: 'Receita' }));
  expect(screen.queryByText('Nubank Roxinho · cartão')).toBeNull();
});
