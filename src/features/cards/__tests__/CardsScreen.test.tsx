import { screen } from '@testing-library/react-native';

import { formatBRL } from '@/lib/money';
import { ServicesProvider } from '@/services';
import { createFakeServices, createFakeStore } from '@/services/fakes';
import { renderWithTheme } from '@/test/render';

import { CardsScreen } from '../CardsScreen';

it('mostra cada cartão com a fatura atual e o limite disponível', async () => {
  const services = createFakeServices(createFakeStore());
  const cards = await services.cards.listCardsWithSummary();
  await renderWithTheme(
    <ServicesProvider services={services}>
      <CardsScreen />
    </ServicesProvider>,
  );
  for (const card of cards) {
    expect(await screen.findByText(card.name)).toBeOnTheScreen();
    expect(screen.getAllByText(formatBRL(card.availableLimitCents)).length).toBeGreaterThan(0);
  }
});

it('sem cartões, convida a cadastrar', async () => {
  const store = createFakeStore();
  store.cards = [];
  await renderWithTheme(
    <ServicesProvider services={createFakeServices(store)}>
      <CardsScreen />
    </ServicesProvider>,
  );
  expect(await screen.findByText('Nenhum cartão ainda')).toBeOnTheScreen();
});

it('com mais de um cartão, soma as faturas atuais', async () => {
  const services = createFakeServices(createFakeStore());
  const cards = await services.cards.listCardsWithSummary();
  const total = cards.reduce((sum, c) => sum + (c.currentInvoice?.remainingCents ?? 0), 0);
  await renderWithTheme(
    <ServicesProvider services={services}>
      <CardsScreen />
    </ServicesProvider>,
  );
  expect(await screen.findByText('Total das faturas atuais')).toBeOnTheScreen();
  expect(screen.getAllByText(formatBRL(total)).length).toBeGreaterThan(0);
  expect(screen.getByText(`Soma de ${cards.length} cartões`)).toBeOnTheScreen();
});
