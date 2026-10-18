import { fireEvent, screen } from '@testing-library/react-native';

import { today } from '@/lib/dates';
import { formatBRL } from '@/lib/money';
import { ServicesProvider } from '@/services';
import { createFakeServices, createFakeStore } from '@/services/fakes';
import { renderWithTheme } from '@/test/render';

import { donutSlices } from '../donut';
import { HomeMonthSummary } from '../HomeMonthSummary';
import { periodRange } from '../period';

const setup = async () => {
  const services = createFakeServices(createFakeStore());
  await renderWithTheme(
    <ServicesProvider services={services}>
      <HomeMonthSummary />
    </ServicesProvider>,
  );
  await screen.findByText('Resumo');
  return services;
};

it('mostra entradas e saídas do mês e o total gasto no centro da rosca', async () => {
  const services = await setup();
  const { from, to } = periodRange('month', today());
  const summary = await services.transactions.getPeriodSummary(from, to);
  expect(screen.getByText(formatBRL(summary.incomeCents, { sign: 'always' }))).toBeOnTheScreen();
  if (summary.expenseCents > 0) expect(screen.getByText('Total gasto')).toBeOnTheScreen();
});

it('tocar numa categoria da legenda mostra o valor dela no centro', async () => {
  const services = await setup();
  const { from, to } = periodRange('year', today());
  await fireEvent.press(screen.getByRole('radio', { name: 'Ano' }));
  const summary = await services.transactions.getPeriodSummary(from, to);
  const [first] = donutSlices(summary.expensesByCategory);
  const category = (await services.categories.listCategories()).find(
    (c) => c.id === first.categoryId,
  )!;
  await fireEvent.press(
    await screen.findByRole('button', { name: `Ver gastos de ${category.name}` }),
  );
  expect(screen.getAllByText(category.name).length).toBeGreaterThan(1);
  expect(screen.getAllByText(formatBRL(first.cents)).length).toBeGreaterThan(1);
});

it('filtro de período troca o título', async () => {
  await setup();
  await fireEvent.press(screen.getByRole('radio', { name: 'Dia' }));
  expect(await screen.findByText('Hoje')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('radio', { name: 'Semana' }));
  expect(await screen.findByText('Esta semana')).toBeOnTheScreen();
});
