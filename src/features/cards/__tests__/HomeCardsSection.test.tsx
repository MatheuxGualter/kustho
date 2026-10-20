import { screen } from '@testing-library/react-native';

import { formatBRL } from '@/lib/money';
import { ServicesProvider } from '@/services';
import { createFakeServices, createFakeStore } from '@/services/fakes';
import { renderWithTheme } from '@/test/render';

import { HomeCardsSection } from '../HomeCardsSection';
import { invoicesTotalCents } from '../InvoicesTotalCard';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: jest.fn() },
}));

it('mostra a fatura de cada cartão e, abaixo, o total das faturas atuais', async () => {
  const services = createFakeServices(createFakeStore());
  const cards = await services.cards.listCardsWithSummary();
  await renderWithTheme(
    <ServicesProvider services={services}>
      <HomeCardsSection />
    </ServicesProvider>,
  );
  for (const card of cards) expect(await screen.findByText(card.name)).toBeOnTheScreen();
  expect(screen.getByText('Total das faturas atuais')).toBeOnTheScreen();
  expect(screen.getAllByText(formatBRL(invoicesTotalCents(cards))).length).toBeGreaterThan(0);
});

it('com um cartão só, não repete o valor como total', async () => {
  const store = createFakeStore();
  store.cards = store.cards.slice(0, 1);
  await renderWithTheme(
    <ServicesProvider services={createFakeServices(store)}>
      <HomeCardsSection />
    </ServicesProvider>,
  );
  expect(await screen.findByText(store.cards[0].name)).toBeOnTheScreen();
  expect(screen.queryByText('Total das faturas atuais')).toBeNull();
});
