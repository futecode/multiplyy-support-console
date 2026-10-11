import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ErrorState, Loading } from '../components/States';

/** Route guard: only a verified support agent (200 from /support/me) gets past. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state, retry, logout } = useAuth();
  const location = useLocation();

  if (state.status === 'checking') return <Loading label="Checking your session…" fullPage />;
  if (state.status === 'error') {
    return (
      <div className="full-page">
        <ErrorState title="Unable to verify your session. Try again." error={state.error} onRetry={retry}>
          <button type="button" className="btn" onClick={() => void logout()}>
            Sign out
          </button>
        </ErrorState>
      </div>
    );
  }
  if (state.status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}
