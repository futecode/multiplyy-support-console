import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import type { ChatMessage, ConversationDetail } from '../api/types';

export interface ChatServerEvents {
  conversation_history: (conversation: ConversationDetail) => void;
  new_message: (message: ChatMessage) => void;
  message_read: (message: ChatMessage) => void;
  error: (err: { message?: string }) => void;
}

export interface ChatClientEvents {
  join_conversation: (payload: { conversationId: string }) => void;
  leave_conversation: (payload: { conversationId: string }) => void;
  send_message: (payload: { conversationId: string; body: string }) => void;
}

export interface DeskServerEvents {
  ticket_updated: (payload: { ticketId: string; change: string }) => void;
}

export type ChatSocket = Socket<ChatServerEvents, ChatClientEvents>;
export type DeskSocket = Socket<DeskServerEvents, Record<string, never>>;

const options = (token: string) => ({ auth: { token }, transports: ['websocket'] });

export const connectChat = (token: string): ChatSocket => io(`${SOCKET_URL}/chat`, options(token));
export const connectDesk = (token: string): DeskSocket => io(`${SOCKET_URL}/support-desk`, options(token));
