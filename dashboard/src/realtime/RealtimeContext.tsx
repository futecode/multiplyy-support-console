import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/endpoints';
import type { SupportConversation } from '../api/types';
import { useAsync, type AsyncState } from '../hooks/useAsync';
import { connectChat, connectDesk, type ChatSocket } from './socket';

/** Bumped on every 'ticket_updated' push; pages refetch when it changes. */
export interface TicketSignal {
  seq: number;
  ticketId: string | null;
}

interface RealtimeValue {
  chat: ChatSocket | null;
  chatConnected: boolean;
  ticketSignal: TicketSignal;
  conversations: AsyncState<SupportConversation[]>;
  unreadTotal: number;
}

const RealtimeContext = createContext<RealtimeValue | null>(null);

/** Safety-net poll for chat unread counts (support only gets pushes for rooms it has joined). */
const CONVERSATION_POLL_MS = 30_000;

export function RealtimeProvider({ token, children }: { token: string; children: ReactNode }) {
  const [chat, setChat] = useState<ChatSocket | null>(null);
  const [chatConnected, setChatConnected] = useState(false);
  const [ticketSignal, setTicketSignal] = useState<TicketSignal>({ seq: 0, ticketId: null });
  const conversations = useAsync(api.conversations);
  const { refresh } = conversations;

  useEffect(() => {
    const desk = connectDesk(token);
    desk.on('ticket_updated', ({ ticketId }) => setTicketSignal((s) => ({ seq: s.seq + 1, ticketId })));

    const socket = connectChat(token);
    const onConnect = () => setChatConnected(true);
    const onDisconnect = () => setChatConnected(false);
    const onActivity = () => void refresh();
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('new_message', onActivity);
    socket.on('message_read', onActivity);
    setChat(socket);
    setChatConnected(socket.connected);

    const timer = setInterval(onActivity, CONVERSATION_POLL_MS);
    return () => {
      clearInterval(timer);
      desk.disconnect();
      socket.disconnect();
      setChat(null);
    };
  }, [token, refresh]);

  const unreadTotal = useMemo(
    () => (conversations.data ?? []).reduce((sum, c) => sum + (c.unreadFromClient || 0), 0),
    [conversations.data],
  );

  const value = useMemo(
    () => ({ chat, chatConnected, ticketSignal, conversations, unreadTotal }),
    [chat, chatConnected, ticketSignal, conversations, unreadTotal],
  );
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used inside <RealtimeProvider>');
  return ctx;
}

/** Calls `onChange` (quietly) after every live ticket push, optionally only for one ticket. */
export function useTicketUpdates(onChange: () => void, ticketId?: string) {
  const { ticketSignal } = useRealtime();
  const { seq, ticketId: changed } = ticketSignal;
  useEffect(() => {
    if (seq === 0) return;
    if (ticketId && changed !== ticketId) return;
    onChange();
    // Only a new push should trigger; onChange identity changes are not events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);
}
