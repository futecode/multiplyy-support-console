import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ChatMessage, ConversationDetail, SupportConversation } from '../api/types';
import { ConversationList, roleLabel } from '../components/ConversationList';
import { Icon } from '../components/Icon';
import { AsyncBlock, Empty, Loading } from '../components/States';
import { useRealtime } from '../realtime/RealtimeContext';
import { chatPartnerLabel, formatDate, formatDateTime, formatTime, initials, matchesConversation, personLabel } from '../utils/format';

const lastActivity = (c: SupportConversation) => c.lastMessage?.createdAt ?? c.updatedAt;

export function ChatPage() {
  const [params] = useSearchParams();
  const activeId = params.get('conversation');
  const { conversations } = useRealtime();
  const [search, setSearch] = useState('');

  const list = useMemo(
    () =>
      (conversations.data ?? [])
        .filter((c) => matchesConversation(c, search))
        .sort((a, b) => lastActivity(b).localeCompare(lastActivity(a))),
    [conversations.data, search],
  );
  const active = conversations.data?.find((c) => c.id === activeId);

  return (
    <div className={`chat-layout${activeId ? ' has-active' : ''}`}>
      <section className="panel chat-list">
        <div className="toolbar">
          <div className="input-icon">
            <Icon name="search" size={16} />
            <input
              type="search"
              aria-label="Search conversations"
              placeholder="Search client, code, phone or partner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="chat-list-body">
          <AsyncBlock state={conversations} what="conversations">
            {(all) =>
              all.length === 0 ? (
                <Empty icon="chat" hint="Chats appear here when a client messages support.">
                  No conversations yet
                </Empty>
              ) : list.length === 0 ? (
                <Empty icon="search" hint="Try a name, client code or phone number.">
                  No conversations match “{search}”
                </Empty>
              ) : (
                <ConversationList conversations={list} activeId={activeId} />
              )
            }
          </AsyncBlock>
        </div>
      </section>

      <section className="panel chat-thread">
        {activeId ? (
          <Thread key={activeId} conversationId={activeId} summary={active} />
        ) : (
          <Empty icon="chat" hint="Pick a chat from the list to read the history and reply as Support.">
            Select a conversation to start replying.
          </Empty>
        )}
      </section>
    </div>
  );
}

function Thread({ conversationId, summary }: { conversationId: string; summary: SupportConversation | undefined }) {
  const { chat, chatConnected, conversations } = useRealtime();
  const refreshList = conversations.refresh;
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const scroller = useRef<HTMLDivElement>(null);

  // Only ever joined to the open conversation: join on open/reconnect, leave on close/switch,
  // otherwise the server keeps auto-marking that thread's messages as read.
  useEffect(() => {
    if (!chat) return;
    const join = () => chat.emit('join_conversation', { conversationId });
    const onHistory = (c: ConversationDetail) => {
      if (c.id !== conversationId) return;
      setDetail(c);
      setMessages(c.messages);
      setError(null);
      void refreshList(); // joining marks incoming read server-side
    };
    const onNew = (m: ChatMessage) => {
      if (m.conversationId !== conversationId) return;
      setMessages((prev) => (prev?.some((x) => x.id === m.id) ? prev : [...(prev ?? []), m]));
    };
    const onRead = (m: ChatMessage) => {
      if (m.conversationId !== conversationId) return;
      setMessages((prev) => prev?.map((x) => (x.id === m.id ? { ...x, readAt: m.readAt } : x)) ?? prev);
    };
    const onError = (e: { message?: string }) => setError(e?.message || 'Something went wrong in chat.');

    chat.on('connect', join);
    chat.on('conversation_history', onHistory);
    chat.on('new_message', onNew);
    chat.on('message_read', onRead);
    chat.on('error', onError);
    if (chat.connected) join();

    return () => {
      if (chat.connected) chat.emit('leave_conversation', { conversationId });
      chat.off('connect', join);
      chat.off('conversation_history', onHistory);
      chat.off('new_message', onNew);
      chat.off('message_read', onRead);
      chat.off('error', onError);
    };
  }, [chat, conversationId, refreshList]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = (e?: FormEvent) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || !chat) return;
    if (!chat.connected) return setError('Not connected to chat. Your message was not sent.');
    chat.emit('send_message', { conversationId, body });
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const name = summary ? personLabel(summary.client) : personLabel({ name: detail?.clientName ?? null, phone: detail?.clientPhone ?? null });
  const code = summary?.client.clientCode ?? detail?.clientCode;
  const phone = summary?.client.phone ?? detail?.clientPhone;
  const clientId = summary?.clientId ?? detail?.clientId;
  const today = formatDate(new Date().toISOString());

  return (
    <>
      <header className="thread-head">
        <Link to="/chat" className="btn btn-ghost btn-icon thread-back" aria-label="Back to conversations">
          <Icon name="back" />
        </Link>
        <span className="avatar avatar-lg" aria-hidden="true">
          {initials(name)}
        </span>
        <div className="thread-title">
          {clientId ? (
            <Link to={`/clients/${clientId}`} className="strong">
              {name}
            </Link>
          ) : (
            <span className="strong">{name}</span>
          )}
          <div className="muted small thread-sub">
            {[code && `Code ${code}`, phone, summary && `Partner: ${chatPartnerLabel(summary.partner)}`]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
        <span className={`pill pill-live conn${chatConnected ? ' on' : ''}`}>
          <span className={`dot${chatConnected ? ' on' : ''}`} aria-hidden="true" />
          {chatConnected ? 'Live' : 'Connecting…'}
        </span>
        <Link to="/chat" className="btn btn-ghost btn-sm thread-close">
          Close
        </Link>
      </header>

      <div className="messages" ref={scroller} aria-live="polite">
        {messages === null ? (
          <Loading label="Loading messages…" />
        ) : messages.length === 0 ? (
          <Empty icon="chat">No messages yet. Say hello.</Empty>
        ) : (
          messages.map((m, i) => {
            const day = formatDate(m.createdAt);
            const prev = messages[i - 1];
            const newDay = !prev || formatDate(prev.createdAt) !== day;
            return (
              <Fragment key={m.id}>
                {newDay && (
                  <div className="day-sep" role="separator">
                    <span>{day === today ? 'Today' : day}</span>
                  </div>
                )}
                <Message m={m} />
              </Fragment>
            );
          })
        )}
      </div>

      {error && (
        <p className="form-error thread-error" role="alert">
          {error}
        </p>
      )}

      <form className="composer" onSubmit={send}>
        <div className="composer-box">
          <textarea
            aria-label="Reply"
            aria-describedby="composer-hint"
            rows={2}
            placeholder="Type a reply as Support…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
            <Icon name="send" size={16} />
            Send
          </button>
        </div>
        <p id="composer-hint" className="composer-hint">
          <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line
        </p>
      </form>
    </>
  );
}

function Message({ m }: { m: ChatMessage }) {
  if (m.senderRole === 'SYSTEM') {
    return (
      <div className="msg msg-bot" data-testid="bot-message">
        <span className="bot-label">
          <Icon name="bot" size={14} /> Greeting bot
        </span>
        <div className="bubble">{m.body}</div>
        <div className="meta" title={formatDateTime(m.createdAt)}>
          {formatTime(m.createdAt)}
        </div>
      </div>
    );
  }
  const outgoing = m.senderRole !== 'CLIENT';
  return (
    <div className={`msg ${m.senderRole === 'SUPPORT' ? 'msg-out' : 'msg-in'} msg-${m.senderRole.toLowerCase()}`}>
      <div className="bubble">{m.body}</div>
      {m.attachmentUrl && (
        <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="small msg-attachment">
          <Icon name="file" size={14} /> Attachment
        </a>
      )}
      <div className="meta" title={formatDateTime(m.createdAt)}>
        {roleLabel(m.senderRole)} · {formatTime(m.createdAt)}
        {outgoing && (
          <span className={`tick${m.readAt ? ' read' : ''}`} aria-label={m.readAt ? 'Read' : 'Sent'} title={m.readAt ? `Read ${formatDateTime(m.readAt)}` : 'Sent'}>
            {m.readAt ? ' ✓✓' : ' ✓'}
          </span>
        )}
      </div>
    </div>
  );
}
