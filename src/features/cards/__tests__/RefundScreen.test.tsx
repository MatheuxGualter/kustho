import { fireEvent, screen } from '@testing-library/react-native';

import { ServicesProvider } from '@/services';
import { createFakeServices, createFakeStore } from '@/services/fakes';
import { renderWithTheme } from '@/test/render';

import { RefundScreen } from '../RefundScreen';

const params: { compra?: string } = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => params,
  Stack: { Screen: () => null },
}));

const setup = async () => {
  const store = createFakeStore();
  const purchase = store.transactions.find(
    (t) => t.kind === 'card_purchase' && t.deletedAt === null,
  )!;
  params.compra = purchase.id;
  await renderWithTheme(
    <ServicesProvider services={createFakeServices(store)}>
      <RefundScreen />
    </ServicesProvider>,
  );
  await screen.findByText(new RegExp(purchase.description));
  return { store, purchase };
};

it('estorna só parte da compra', async () => {
  const { store, purchase } = await setup();
  const before = store.transactions.length;
  const field = screen.getByLabelText('Valor estornado');
  await fireEvent.changeText(field, '100');
  await fireEvent.press(screen.getByRole('button', { name: 'Registrar estorno' }));

  expect(store.transactions).toHaveLength(before + 1);
  expect(store.transactions.at(-1)).toMatchObject({
    kind: 'adjustment',
    direction: 'in',
    amountCents: 100,
    cardId: purchase.cardId,
  });
});

it('não deixa estornar mais que a compra', async () => {
  const { purchase } = await setup();
  await fireEvent.changeText(
    screen.getByLabelText('Valor estornado'),
    String(purchase.amountCents + 1),
  );
  expect(screen.getByText(/não pode passar de/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Registrar estorno' })).toBeDisabled();
});

it('desconta os estornos anteriores', async () => {
  const store = createFakeStore();
  const services = createFakeServices(store);
  const purchase = store.transactions.find(
    (t) => t.kind === 'card_purchase' && t.deletedAt === null,
  )!;
  await services.cards.refundCardPurchase(purchase.id, purchase.amountCents - 50, '2026-10-18');
  params.compra = purchase.id;
  await renderWithTheme(
    <ServicesProvider services={services}>
      <RefundScreen />
    </ServicesProvider>,
  );
  expect(await screen.findByText(/ainda dá para estornar R\$\s0,50/)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Valor estornado'), '51');
  expect(screen.getByRole('button', { name: 'Registrar estorno' })).toBeDisabled();
});
