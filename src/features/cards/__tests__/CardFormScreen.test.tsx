import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ServicesProvider } from '@/services';
import { createFakeServices, createFakeStore } from '@/services/fakes';
import { renderWithTheme } from '@/test/render';

import { CardFormScreen } from '../CardFormScreen';

let mockParams: { id?: string } = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { back: jest.fn(), push: jest.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
}));

const render = async () => {
  const store = createFakeStore();
  const services = createFakeServices(store);
  await renderWithTheme(
    <ServicesProvider services={services}>
      <CardFormScreen />
    </ServicesProvider>,
  );
  return { store, services };
};

beforeEach(() => jest.clearAllMocks());

it('cartão novo com fatura em andamento: lança a fatura como ajuste', async () => {
  mockParams = {};
  const { store, services } = await render();
  await fireEvent.press(screen.getAllByLabelText('Nubank')[0]);
  await fireEvent.changeText(screen.getByLabelText('Nome do cartão'), 'Roxinho 2');
  await fireEvent.changeText(screen.getByLabelText('Limite'), '500000');
  await fireEvent.changeText(screen.getByLabelText('Fatura atual'), '123456');
  await fireEvent.changeText(screen.getByLabelText('Dia do fechamento'), '5');
  await fireEvent.changeText(screen.getByLabelText('Dia do vencimento'), '12');
  await fireEvent.press(screen.getByRole('button', { name: 'Criar cartão' }));

  const card = store.cards.find((c) => c.name === 'Roxinho 2')!;
  expect(card).toBeDefined();
  const summary = (await services.cards.listCardsWithSummary()).find((c) => c.id === card.id)!;
  expect(summary.currentInvoice?.remainingCents).toBe(123456);
  expect(store.transactions.at(-1)).toMatchObject({
    kind: 'adjustment',
    direction: 'out',
    description: 'Ajuste da fatura',
    cardId: card.id,
  });
  expect(router.back).toHaveBeenCalled();
});

it('editar: mostra a fatura atual e lança só a diferença quando muda', async () => {
  const store = createFakeStore();
  const services = createFakeServices(store);
  const [card] = await services.cards.listCardsWithSummary();
  mockParams = { id: card.id };
  await renderWithTheme(
    <ServicesProvider services={services}>
      <CardFormScreen />
    </ServicesProvider>,
  );
  const field = await screen.findByLabelText('Fatura atual');
  expect(screen.getByText(/Fatura que fecha/)).toBeOnTheScreen();

  const before = store.transactions.length;
  const target = (card.currentInvoice?.remainingCents ?? 0) + 1000;
  await fireEvent.changeText(field, String(target));
  await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

  expect(store.transactions).toHaveLength(before + 1);
  expect(store.transactions.at(-1)).toMatchObject({ direction: 'out', amountCents: 1000 });
  const after = (await services.cards.listCardsWithSummary()).find((c) => c.id === card.id)!;
  expect(after.currentInvoice?.remainingCents).toBe(target);
});

it('editar sem mexer na fatura não lança ajuste', async () => {
  const store = createFakeStore();
  const services = createFakeServices(store);
  const [card] = await services.cards.listCardsWithSummary();
  mockParams = { id: card.id };
  await renderWithTheme(
    <ServicesProvider services={services}>
      <CardFormScreen />
    </ServicesProvider>,
  );
  await screen.findByLabelText('Fatura atual');
  const before = store.transactions.length;
  await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
  expect(store.transactions).toHaveLength(before);
  expect(router.back).toHaveBeenCalled();
});
