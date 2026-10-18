/**
 * Acesso das telas aos serviços. O app passa os serviços reais (`./app.ts`) ao provider no
 * layout raiz; testes de tela passam fakes (`createFakeServices`).
 */
import { createContext, type ReactNode, useContext } from 'react';

import type { Services } from '@/domain/contracts';

export { notifyDataChanged, type QueryState, useServiceQuery } from './dataVersion';
export { createFakeServices } from './fakes';

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services: Services;
  children: ReactNode;
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices precisa estar dentro de <ServicesProvider>');
  return services;
}
