/**
 * ═══════════════════════════════════════════════════════════════
 *  useAsync — Hook genérico para chamadas assíncronas
 *  Gerencia estados de loading/data/error com reload automático
 *  BLK-02: Substitui catch silencioso em todas as telas
 * ═══════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState } from 'react';

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

/**
 * Hook que encapsula uma chamada assíncrona com gerenciamento de estado.
 *
 * @param fn - Função assíncrona a ser executada
 * @param deps - Dependências para re-execução automática
 * @returns { data, loading, error, reload }
 *
 * @example
 * const { data: stats, loading, error, reload } = useAsync(() => api.getMyStats(), []);
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState({ data: null, loading: false, error: e as Error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, reload: run };
}

/**
 * Versão lazy do useAsync — não executa automaticamente.
 * Útil para ações disparadas por interação (submit, etc).
 *
 * @example
 * const { execute, loading, error } = useAsyncAction();
 * const handleSubmit = () => execute(() => api.submitMission(id));
 */
export function useAsyncAction<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (fn: () => Promise<T>) => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await fn();
      setState({ data, loading: false, error: null });
      return data;
    } catch (e) {
      setState({ data: null, loading: false, error: e as Error });
      throw e;
    }
  }, []);

  return { ...state, execute };
}
