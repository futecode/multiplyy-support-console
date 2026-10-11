import { Link } from 'react-router-dom';
import type { SupportConversation } from '../api/types';
import { chatPartnerLabel, formatDateTime, initials, personLabel, timeAgo } from '../utils/format';
import { UnreadBadge } from './Badges';

export function ConversationList({
  conversations,
  activeId,
}: {
  conversations: SupportConversation[];
  activeId?: string | null;
}) {
  return (
    <ul className="conv-list">
      {conversations.map((c) => {
        const name = personLabel(c.client);
        const preview = c.lastMessage
          ? `${c.lastMessage.senderRole === 'CLIENT' ? '' : `${roleLabel(c.lastMessage.senderRole)}: `}${c.lastMessage.body}`
          : 'No messages yet';
        return (
          <li key={c.id}>
            <Link
              to={`/chat?conversation=${encodeURIComponent(c.id)}`}
              className={`conv-item${c.id === activeId ? ' active' : ''}${c.unreadFromClient > 0 ? ' is-unread' : ''}`}
              aria-current={c.id === activeId ? 'true' : undefined}
            >
              <span className="avatar" aria-hidden="true">
                {initials(name)}
              </span>
              <span className="conv-main">
                <span className="conv-top">
                  <span className="conv-name">{name}</span>
                  {c.lastMessage && (
                    <time className="conv-time" dateTime={c.lastMessage.createdAt} title={formatDateTime(c.lastMessage.createdAt)}>
                      {timeAgo(c.lastMessage.createdAt)}
                    </time>
                  )}
                </span>
                <span className="conv-bottom">
                  <span className="conv-sub" title={preview}>
                    {preview}
                  </span>
                  <UnreadBadge count={c.unreadFromClient} label={`${c.unreadFromClient} unread from ${name}`} />
                </span>
                <span className="conv-meta">
                  {c.client.clientCode && <span className="mono">{c.client.clientCode}</span>}
                  {c.client.clientCode && ' · '}
                  {chatPartnerLabel(c.partner)}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function roleLabel(role: string): string {
  switch (role) {
    case 'SUPPORT':
      return 'Support';
    case 'PARTNER':
      return 'Partner';
    case 'SYSTEM':
      return 'Bot';
    default:
      return 'Client';
  }
}
