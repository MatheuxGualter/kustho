import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { create } from 'zustand';

type DataVersionState = { version: number; bump: () => void };

/** Contador global de mudanças: toda escrita incrementa, e as consultas refazem a leitura. */
const useDataVersion = create<DataVersionState>()((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));

let pending = false;

/** Avisa as telas que os dados mudaram. Várias chamadas seguidas viram uma só. */
export function notifyDataChanged(): void {
  if (pending) return;
  pending = true;
  queueMicrotask(() => {
    pending = false;
    useDataVersion.getState().bump();
  });
}

/** Liga o aviso às mudanças do SQLite: serviços reais não precisam chamar nada. */
export function subscribeToDatabaseChanges(): () => void {
  const subscription = addDatabaseChangeListener(() => notifyDataChanged());
  return () => subscription.remove();
}

export type QueryState<T> =
  | { status: 'loading'; data: undefined; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: undefined; error: Error };

/**
 * Lê dados de um serviço e refaz a leitura quando `deps` muda ou quando qualquer dado
 * do app muda. Enquanto recarrega, mantém o último resultado na tela.
 */
export function useServiceQuery<T>(
  query: () => Promise<T>,
  deps: readonly unknown[],
): QueryState<T> {
  const version = useDataVersion((s) => s.version);
  const [state, setState] = useState<QueryState<T>>({
    status: 'loading',
    data: undefined,
    error: null,
  });

  useEffect(() => {
    let active = true;
    query().then(
      (data) => active && setState({ status: 'success', data, error: null }),
      (e: unknown) =>
        active &&
        setState({
          status: 'error',
          data: undefined,
          error: e instanceof Error ? e : new Error(String(e)),
        }),
    );
    return () => {
      active = false;
    };
    // `query` muda a cada render; quem controla a releitura são `deps` e `version`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);

  return state;
}
