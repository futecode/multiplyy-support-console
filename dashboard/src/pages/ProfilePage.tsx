import { useAgent, useAuth } from '../auth/AuthContext';
import { useRealtime } from '../realtime/RealtimeContext';
import { initials } from '../utils/format';

export function ProfilePage() {
  const agent = useAgent();
  const { logout } = useAuth();
  const { chatConnected } = useRealtime();

  return (
    <section className="panel narrow">
      <div className="panel-head">
        <div className="panel-title">
          <span className="avatar avatar-lg" aria-hidden="true">
            {initials(agent.name || 'Support agent')}
          </span>
          <h2>{agent.name || 'Support agent'}</h2>
        </div>
      </div>
      <dl className="panel-body dl">
        <dt>Name</dt>
        <dd>{agent.name ?? '—'}</dd>
        <dt>Phone</dt>
        <dd>{agent.phone}</dd>
        <dt>User ID</dt>
        <dd className="mono">{agent.userId}</dd>
        <dt>Role</dt>
        <dd>Support</dd>
        <dt>Live chat</dt>
        <dd>
          <span className={`pill pill-live${chatConnected ? ' on' : ''}`}>
            <span className={`dot${chatConnected ? ' on' : ''}`} aria-hidden="true" />
            {chatConnected ? 'Connected' : 'Not connected'}
          </span>
        </dd>
      </dl>
      <div className="panel-body">
        <button type="button" className="btn btn-danger" onClick={() => void logout()}>
          Logout
        </button>
      </div>
    </section>
  );
}
