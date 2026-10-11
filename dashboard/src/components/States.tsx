import type { ReactNode } from 'react';
import { NETWORK_MESSAGE, type ApiError } from '../api/client';
import { Icon, type IconName } from './Icon';

export function Loading({
  label = 'Loading…',
  fullPage = false,
  skeleton = false,
}: {
  label?: string;
  fullPage?: boolean;
  /** Shimmer rows instead of a spinner (lists / cards). The label stays for screen readers. */
  skeleton?: boolean;
}) {
  if (skeleton) {
    return (
      <div className="skeleton-list" role="status" aria-live="polite">
        <span className="sr-only">{label}</span>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="skeleton-row" aria-hidden="true">
            <span className="skeleton skeleton-avatar" />
            <span className="skeleton-lines">
              <span className="skeleton skeleton-line" />
              <span className="skeleton skeleton-line short" />
            </span>
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className={fullPage ? 'full-page' : 'state'} role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Empty({
  children,
  hint,
  icon = 'inbox',
  action,
}: {
  children: ReactNode;
  hint?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <div className="state state-empty">
      <span className="state-icon">
        <Icon name={icon} size={22} />
      </span>
      <span className="state-title">{children}</span>
      {hint && <span className="state-hint">{hint}</span>}
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  error,
  onRetry,
  children,
}: {
  title: string;
  error?: ApiError;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="state state-error" role="alert">
      <span className="state-icon">
        <Icon name="alert" size={22} />
      </span>
      <strong className="state-title">{title}</strong>
      {error && <span className="state-hint">{error.isNetwork ? NETWORK_MESSAGE : error.message}</span>}
      <div className="row-gap">
        {onRetry && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Retry
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

/** Standard loading / error / content switch for one async block. */
export function AsyncBlock<T>({
  state,
  what,
  children,
}: {
  state: { data: T | undefined; error: ApiError | undefined; loading: boolean; reload: () => void };
  what: string;
  children: (data: T) => ReactNode;
}) {
  if (state.loading || (state.data === undefined && !state.error)) return <Loading skeleton />;
  if (state.error || state.data === undefined) {
    return <ErrorState title={`Unable to load ${what}. Try again.`} error={state.error} onRetry={state.reload} />;
  }
  return <>{children(state.data)}</>;
}
