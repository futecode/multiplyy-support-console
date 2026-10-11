import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, onUnauthorized, session } from '../api/client';
import { api } from '../api/endpoints';
import type { SupportMe } from '../api/types';

export const NO_ACCESS_MESSAGE = "This account doesn't have support access";
export const EXPIRED_MESSAGE = 'Your session has ended. Please sign in again.';

export type AuthState =
  | { status: 'checking' }
  | { status: 'anonymous'; notice?: string }
  | { status: 'authenticated'; agent: SupportMe }
  | { status: 'error'; error: ApiError };

interface AuthContextValue {
  state: AuthState;
  token: string | null;
  /** Stores the session token, then proves support access via /support/me. */
  login: (sessionToken: string) => Promise<SupportMe>;
  logout: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError(0, 'UNKNOWN', e instanceof Error ? e.message : 'Something went wrong');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    session.get() ? { status: 'checking' } : { status: 'anonymous' },
  );

  const endSession = useCallback((notice?: string) => {
    session.clear();
    setState({ status: 'anonymous', notice });
  }, []);

  const verify = useCallback(async () => {
    try {
      const agent = await api.me();
      setState({ status: 'authenticated', agent });
      return agent;
    } catch (e) {
      const err = toApiError(e);
      if (err.status === 403) {
        endSession(NO_ACCESS_MESSAGE);
        throw new ApiError(403, err.code, NO_ACCESS_MESSAGE);
      }
      if (err.status === 401) endSession(EXPIRED_MESSAGE);
      throw err;
    }
  }, [endSession]);

  useEffect(() => {
    onUnauthorized(() => endSession(EXPIRED_MESSAGE));
    return () => onUnauthorized(null);
  }, [endSession]);

  const check = useCallback(() => {
    if (!session.get()) return;
    setState({ status: 'checking' });
    verify().catch((err: ApiError) => {
      if (err.status !== 401 && err.status !== 403) setState({ status: 'error', error: err });
    });
  }, [verify]);

  useEffect(check, [check]);

  const login = useCallback(
    async (sessionToken: string) => {
      session.set(sessionToken);
      try {
        return await verify();
      } catch (e) {
        session.clear();
        throw e;
      }
    },
    [verify],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // The session is dropped locally either way.
    }
    endSession();
  }, [endSession]);

  const token = state.status === 'authenticated' ? session.get() : null;
  const value = useMemo(() => ({ state, token, login, logout, retry: check }), [state, token, login, logout, check]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function useAgent(): SupportMe {
  const { state } = useAuth();
  if (state.status !== 'authenticated') throw new Error('useAgent requires an authenticated session');
  return state.agent;
}
