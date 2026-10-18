/**
 * Registro dos serviços usados pelas telas. Cada trilha troca o seu fake pela
 * implementação real aqui, numa linha, quando o serviço real estiver pronto e testado.
 */
import { createContext, type ReactNode, useContext } from 'react';

import type { Services } from '@/domain/contracts';

import { createFakeServices } from './fakes';

export { notifyDataChanged, type QueryState, useServiceQuery } from './dataVersion';
export { createFakeServices };

function createAppServices(): Services {
  const fakes = createFakeServices();
  return {
    accounts: fakes.accounts, // Trilha A: trocar por createAccountsService(db)
    transactions: fakes.transactions, // Trilha B: trocar por createTransactionsService(db)
    cards: fakes.cards, // Trilha C: trocar por createCardsService(db)
    categories: fakes.categories, // Trilha D: trocar por createCategoriesService(db)
  };
}

const ServicesContext = createContext<Services | null>(null);

let appServices: Services | null = null;

function getAppServices(): Services {
  appServices ??= createAppServices();
  return appServices;
}

/** Disponibiliza os serviços para as telas. Testes passam `services` próprios. */
export function ServicesProvider({
  services,
  children,
}: {
  services?: Services;
  children: ReactNode;
}) {
  return (
    <ServicesContext.Provider value={services ?? getAppServices()}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices precisa estar dentro de <ServicesProvider>');
  return services;
}
