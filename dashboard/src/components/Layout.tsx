import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import logoUrl from '../assets/logo.svg';
import { useAgent, useAuth } from '../auth/AuthContext';
import { useRealtime } from '../realtime/RealtimeContext';
import { APP_ROUTES, findRoute } from '../routes';
import { initials } from '../utils/format';
import { UnreadBadge } from './Badges';
import { Icon } from './Icon';

const NAV = APP_ROUTES.flatMap((r) => (r.nav ? [{ to: r.path, ...r.nav }] : []));

export function Layout() {
  const { pathname } = useLocation();
  const agent = useAgent();
  const { logout } = useAuth();
  const { unreadTotal, chatConnected } = useRealtime();
  const route = findRoute(pathname);
  const title = route?.title ?? 'Support';
  const subtitle = route?.subtitle ?? '';
  const agentName = agent.name || 'Support agent';

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">
            <img src={logoUrl} alt="" width={30} height={22} />
          </span>
          <span className="brand-text">
            <span className="brand-name">Multiplyy</span>
            <span className="brand-sub">Support Desk</span>
          </span>
        </div>
        <nav className="nav" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className="nav-link" title={item.label}>
              <Icon name={item.icon} />
              <span className="nav-label">{item.label}</span>
              {item.to === '/chat' && <UnreadBadge count={unreadTotal} label={`${unreadTotal} unread chats`} />}
            </NavLink>
          ))}
        </nav>
        <Link to="/profile" className="me-card" title={agentName}>
          <span className="avatar">{initials(agentName)}</span>
          <span className="me-text">
            <span className="me-name">{agentName}</span>
            <span className="me-phone">{agent.phone}</span>
          </span>
        </Link>
      </aside>

      <div className="main">
        <header className="header">
          <div className="page-heading">
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="page-sub">{subtitle}</p>}
          </div>
          <div className="header-right">
            <span
              className={`pill pill-live${chatConnected ? ' on' : ''}`}
              title={chatConnected ? 'Chat connected' : 'Chat disconnected'}
            >
              <span className={`dot${chatConnected ? ' on' : ''}`} aria-hidden="true" />
              <span className="pill-text">{chatConnected ? 'Live' : 'Offline'}</span>
            </span>
            <Link to="/chat" className={`pill pill-unread${unreadTotal > 0 ? ' has-unread' : ''}`}>
              <Icon name="chat" size={16} />
              <span data-testid="header-unread">
                {unreadTotal > 0 ? `${unreadTotal} unread chat${unreadTotal === 1 ? '' : 's'}` : 'No unread chats'}
              </span>
            </Link>
            <Link to="/profile" className="avatar avatar-btn" aria-label={`Your profile (${agentName})`} title={agentName}>
              {initials(agentName)}
            </Link>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              aria-label="Logout"
              title="Logout"
              onClick={() => void logout()}
            >
              <Icon name="logout" />
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
