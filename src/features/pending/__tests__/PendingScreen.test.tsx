import { fireEvent, screen } from '@testing-library/react-native';

import { ServicesProvider } from '@/services';
import { createFakeServices, createFakeStore } from '@/services/fakes';
import { renderWithTheme } from '@/test/render';

import { PendingScreen } from '../PendingScreen';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { back: jest.fn(), push: jest.fn() },
}));

// O fake começa com três pendentes: compra no cartão, Pix recebido e uma não interpretada.
const setup = async () => {
  const store = createFakeStore();
  await renderWithTheme(
    <ServicesProvider services={createFakeServices(store)}>
      <PendingScreen />
    </ServicesProvider>,
  );
  await screen.findByText('PADARIA EXEMPLO');
  return store;
};

it('mostra as sugestões e a não interpretada pede para completar', async () => {
  await setup();
  expect(screen.getByText('FULANO DE TAL')).toBeTruthy();
  expect(screen.getByText('Toque em Completar para informar valor, tipo e origem.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Completar' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Confirmar 2 prontas' })).toBeTruthy();
});

it('confirmar cria o lançamento de notificação e tira da caixa', async () => {
  const store = await setup();
  const before = store.transactions.length;
  const pix = store.captures.find((c) => c.merchant === 'FULANO DE TAL')!;

  const [, confirmPix] = screen.getAllByRole('button', { name: 'Confirmar' });
  await fireEvent.press(confirmPix);

  expect(store.transactions).toHaveLength(before + 1);
  expect(store.transactions.at(-1)).toMatchObject({
    kind: 'income',
    amountCents: 15000,
    source: 'notification',
    accountId: pix.suggestedAccountId,
  });
  expect(await screen.findByText('PADARIA EXEMPLO')).toBeTruthy();
  expect(screen.queryByText('FULANO DE TAL')).toBeNull();
});

it('descartar tira da caixa sem criar lançamento', async () => {
  const store = await setup();
  const before = store.transactions.length;

  const [discardFirst] = screen.getAllByRole('button', { name: 'Descartar' });
  await fireEvent.press(discardFirst);

  expect(store.transactions).toHaveLength(before);
  expect(store.captures.filter((c) => c.status === 'discarded')).toHaveLength(1);
});
