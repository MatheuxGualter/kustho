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

it('captura igual a um lançamento existente sugere vincular, sem criar outro', async () => {
  const store = createFakeStore();
  const pix = store.captures.find((c) => c.merchant === 'FULANO DE TAL')!;
  const existing = store.transactions.find((t) => t.kind === 'income' && t.deletedAt === null)!;
  pix.matchTransactionId = existing.id;
  pix.matchScore = 0.9;
  await renderWithTheme(
    <ServicesProvider services={createFakeServices(store)}>
      <PendingScreen />
    </ServicesProvider>,
  );
  expect(await screen.findByText('Parece ser um lançamento que você já registrou:')).toBeTruthy();
  const before = store.transactions.length;
  await fireEvent.press(screen.getByRole('button', { name: 'Vincular' }));
  expect(store.transactions).toHaveLength(before);
  expect(pix).toMatchObject({ status: 'confirmed', transactionId: existing.id });
});

it('estorno capturado mostra a compra e confirmar lança o estorno, sem vincular', async () => {
  const store = createFakeStore();
  const purchase = store.transactions.find(
    (t) => t.kind === 'card_purchase' && t.deletedAt === null && t.installmentTotal === null,
  )!;
  const refund = store.captures.find((c) => c.merchant === 'FULANO DE TAL')!;
  Object.assign(refund, {
    kind: 'card_refund',
    merchant: 'Estorno da loja',
    amountCents: 100,
    matchTransactionId: purchase.id,
    matchScore: 0.8,
  });
  await renderWithTheme(
    <ServicesProvider services={createFakeServices(store)}>
      <PendingScreen />
    </ServicesProvider>,
  );
  expect(await screen.findByText('Estorno da compra:')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Vincular' })).toBeNull();

  const [, confirmRefund] = screen.getAllByRole('button', { name: 'Confirmar' });
  await fireEvent.press(confirmRefund);
  expect(store.transactions.at(-1)).toMatchObject({
    kind: 'adjustment',
    direction: 'in',
    amountCents: 100,
    refundOfId: purchase.id,
  });
  expect(refund.status).toBe('confirmed');
});

it('o que entrou sozinho aparece no resumo com selo e Desfazer', async () => {
  const store = createFakeStore();
  const services = createFakeServices(store);
  const pix = store.captures.find((c) => c.merchant === 'FULANO DE TAL')!;
  pix.postedAt = new Date().toISOString();
  const [tx] = await services.captures.confirmCapture(pix.id);
  pix.autoConfirmed = true;
  await renderWithTheme(
    <ServicesProvider services={services}>
      <PendingScreen />
    </ServicesProvider>,
  );
  expect(await screen.findByText('1 lançamento entrou sozinho')).toBeTruthy();
  expect(screen.getByText('automático')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Desfazer' }));
  expect(pix).toMatchObject({ status: 'pending', autoConfirmed: false, transactionId: null });
  expect(store.transactions.find((t) => t.id === tx.id)?.deletedAt).not.toBeNull();
  expect(await screen.findByText('FULANO DE TAL')).toBeTruthy();
  expect(screen.queryByText('1 lançamento entrou sozinho')).toBeNull();
});
