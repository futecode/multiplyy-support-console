import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiError } from '../api/client';
import { toApiError } from '../auth/AuthContext';

export interface AsyncState<T> {
  data: T | undefined;
  error: ApiError | undefined;
  loading: boolean;
  /** Full reload (shows loading). */
  reload: () => void;
  /** Background refetch: keeps current data on screen and ignores failures. */
  refresh: () => Promise<T | undefined>;
  setData: (data: T) => void;
}

/**
 * Runs `fn` whenever it changes (wrap it in useCallback with its inputs as deps).
 * Late responses from superseded calls are dropped.
 */
export function useAsync<T>(fn: () => Promise<T>): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiError>();
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  const run = useCallback(
    async (quiet: boolean): Promise<T | undefined> => {
      const mine = ++seq.current;
      if (!quiet) {
        setLoading(true);
        setError(undefined);
      }
      try {
        const result = await fn();
        if (mine === seq.current) {
          setData(result);
          setError(undefined);
        }
        return result;
      } catch (e) {
        if (!quiet && mine === seq.current) setError(toApiError(e));
        return undefined;
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    },
    [fn],
  );

  useEffect(() => {
    void run(false);
  }, [run]);

  const reload = useCallback(() => void run(false), [run]);
  const refresh = useCallback(() => run(true), [run]);

  return { data, error, loading, reload, refresh, setData };
}
