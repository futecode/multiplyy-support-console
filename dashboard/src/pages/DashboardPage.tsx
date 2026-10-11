import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/endpoints';
import type { TicketActivity } from '../api/types';
import { StatusBadge } from '../components/Badges';
import { ConversationList } from '../components/ConversationList';
import { Icon, type IconName } from '../components/Icon';
import { AsyncBlock, Empty } from '../components/States';
import { TicketTable } from '../components/TicketTable';
import { useAsync } from '../hooks/useAsync';
import { useRealtime, useTicketUpdates } from '../realtime/RealtimeContext';
import { byUnreadThenRecent, eventTitle, formatDateTime, timeAgo } from '../utils/format';

const RECENT_TICKETS = 8;
const TOP_CONVERSATIONS = 5;

export function DashboardPage() {
  const tickets = useAsync(useCallback(() => api.tickets({ page: 1 }), []));
  const activity = useAsync(useCallback(() => api.ticketActivity(20), []));
  const { conversations, unreadTotal } = useRealtime();
  const refreshTickets = tickets.refresh;
  const refreshActivity = activity.refresh;

  useTicketUpdates(() => {
    void refreshTickets();
    void refreshActivity();
  });

  return (
    <div className="stack">
      <AsyncBlock state={tickets} what="tickets">
        {(page) => (
          <>
            <section className="cards" aria-label="Ticket counts">
              <CountCard label="Open" value={page.counts.open} to="/tickets?status=OPEN" tone="open" icon="open" />
              <CountCard
                label="In progress"
                value={page.counts.inProgress}
                to="/tickets?status=IN_PROGRESS"
                tone="progress"
                icon="clock"
              />
              <CountCard label="Resolved" value={page.counts.resolved} to="/tickets?status=RESOLVED" tone="resolved" icon="check" />
              <CountCard label="All tickets" value={page.counts.all} to="/tickets" tone="all" icon="layers" />
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>Recent tickets</h2>
                <Link to="/tickets" className="panel-link">
                  View all
                </Link>
              </div>
              {page.items.length ? (
                <TicketTable tickets={page.items.slice(0, RECENT_TICKETS)} compact />
              ) : (
                <Empty icon="ticket" hint="New partner requests will show up here.">
                  No tickets found
                </Empty>
              )}
            </section>
          </>
        )}
      </AsyncBlock>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Recent activity</h2>
          </div>
          <AsyncBlock state={activity} what="activity">
            {(items) =>
              items.length ? (
                <ActivityFeed items={items} />
              ) : (
                <Empty icon="clock" hint="Ticket updates from partners and support appear here.">
                  No activity yet
                </Empty>
              )
            }
          </AsyncBlock>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Unread chats</h2>
            <Link to="/chat" className="panel-link">
              Open inbox
            </Link>
          </div>
          <AsyncBlock state={conversations} what="conversations">
            {(list) => (
              <>
                <p className="panel-summary">
                  <strong>{unreadTotal}</strong> unread message{unreadTotal === 1 ? '' : 's'} across{' '}
                  {list.filter((c) => c.unreadFromClient > 0).length} conversation(s)
                </p>
                {list.length ? (
                  <ConversationList conversations={[...list].sort(byUnreadThenRecent).slice(0, TOP_CONVERSATIONS)} />
                ) : (
                  <Empty icon="chat" hint="Client chats will appear here as they come in.">
                    No conversations yet
                  </Empty>
                )}
              </>
            )}
          </AsyncBlock>
        </section>
      </div>
    </div>
  );
}

function CountCard({
  label,
  value,
  to,
  tone,
  icon,
}: {
  label: string;
  value: number;
  to: string;
  tone: string;
  icon: IconName;
}) {
  return (
    <Link to={to} className={`card count-card tone-${tone}`}>
      <span className="count-icon">
        <Icon name={icon} size={20} />
      </span>
      <span className="count-label">{label}</span>
      <span className="count-value">{value}</span>
    </Link>
  );
}

function ActivityFeed({ items }: { items: TicketActivity[] }) {
  return (
    <ol className="feed">
      {items.map((a) => (
        <li key={a.id} className={`feed-item actor-${a.actorRole.toLowerCase()}`}>
          <span className="feed-dot" aria-hidden="true" />
          <div className="feed-body">
            <div className="feed-head">
              <Link to={`/tickets/${a.ticketId}`} className="ticket-ref">
                {a.ticketNo}
              </Link>
              <span className="muted truncate">{a.categoryLabel}</span>
              <StatusBadge status={a.ticketStatus} />
            </div>
            <div className="feed-title">
              {eventTitle(a)}{' '}
              <span className={`actor actor-${a.actorRole.toLowerCase()}`}>
                {a.actorRole === 'SUPPORT' ? 'Support' : 'Partner'}
              </span>
            </div>
            {a.note && <div className="feed-note">{a.note}</div>}
            <time className="muted small" dateTime={a.createdAt} title={formatDateTime(a.createdAt)}>
              {timeAgo(a.createdAt)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
