import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, ConversationDetail, SupportConversation } from '../api/types';
import { lastChat, resetSockets } from '../test/fakeSocket';
import { mockApi, renderApp } from '../test/utils';

vi.mock('../realtime/socket', async () => (await import('../test/fakeSocket')).fakeSocketModule);

beforeEach(resetSockets);

function conv(id: string, name: string, unread: number): SupportConversation {
  return {
    id,
    clientId: `client-${id}`,
    partnerId: 'p1',
    status: 'OPEN',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    client: { userId: `client-${id}`, phone: '8000000001', name, clientCode: `CODE-${id}` },
    partner: { partnerId: 'p1', userId: 'pu1', name: 'Ravi Partner', phone: '7000000001' },
    participants: [],
    lastMessage: { id: `m-${id}`, body: `hello from ${name}`, senderRole: 'CLIENT', createdAt: '2026-10-01T10:00:00.000Z', readAt: null },
    unreadFromClient: unread,
  };
}

function msg(over: Partial<ChatMessage>): ChatMessage {
  return {
    id: 'm1',
    conversationId: 'c1',
    senderId: 'u1',
    senderRole: 'CLIENT',
    body: 'Hi',
    attachmentUrl: null,
    readAt: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    ...over,
  };
}

const CONVERSATIONS = [conv('c1', 'Karan Client', 2), conv('c2', 'Meera Client', 1)];

describe('chat', () => {
  it('loads the inbox with unread badges and a header total', async () => {
    mockApi({ 'GET /partner-client-chat/support/conversations': () => CONVERSATIONS });
    renderApp('/chat');
    expect(await screen.findByText('Karan Client')).toBeInTheDocument();
    expect(screen.getByLabelText('2 unread from Karan Client')).toHaveTextContent('2');
    expect(screen.getByLabelText('1 unread from Meera Client')).toHaveTextContent('1');
    expect(screen.getByTestId('header-unread')).toHaveTextContent('3 unread chats');
  });

  it('joins the open conversation, shows history, sends, receives, and leaves on switch', async () => {
    mockApi({ 'GET /partner-client-chat/support/conversations': () => CONVERSATIONS });
    const user = userEvent.setup();
    renderApp('/chat?conversation=c1');

    await screen.findByText('Karan Client', { selector: '.thread-title a' });
    const socket = lastChat();
    expect(socket.emitsOf('join_conversation')).toEqual([{ conversationId: 'c1' }]);

    const history: ConversationDetail = {
      id: 'c1',
      clientId: 'client-c1',
      partnerId: 'p1',
      status: 'OPEN',
      createdAt: '2026-10-01T10:00:00.000Z',
      clientName: 'Karan Client',
      clientCode: 'CODE-c1',
      clientPhone: '8000000001',
      participants: [],
      messages: [
        msg({ id: 'm0', senderRole: 'SYSTEM', body: 'Welcome! A partner will reply soon.' }),
        msg({ id: 'm1', body: 'Need help with SIP' }),
        msg({ id: 'm2', senderRole: 'SUPPORT', body: 'Sure', readAt: '2026-10-01T10:05:00.000Z' }),
      ],
    };
    socket.serverEmit('conversation_history', history);
    expect(screen.getByText('Need help with SIP')).toBeInTheDocument();
    expect(screen.getByTestId('bot-message')).toHaveTextContent('Welcome! A partner will reply soon.');
    expect(screen.getByLabelText('Read')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Reply'), 'We are on it');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(socket.emitsOf('send_message')).toEqual([{ conversationId: 'c1', body: 'We are on it' }]);
    expect(screen.getByLabelText('Reply')).toHaveValue('');

    socket.serverEmit('new_message', msg({ id: 'm3', body: 'Thanks a lot!' }));
    expect(screen.getByText('Thanks a lot!')).toBeInTheDocument();
    // A message for another conversation must not leak into this thread.
    socket.serverEmit('new_message', msg({ id: 'm4', conversationId: 'c2', body: 'Other thread' }));
    expect(screen.queryByText('Other thread')).not.toBeInTheDocument();

    await user.click(screen.getByText('Meera Client'));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/chat?conversation=c2'));
    expect(socket.emitsOf('leave_conversation')).toEqual([{ conversationId: 'c1' }]);
    expect(socket.emitsOf('join_conversation')).toEqual([{ conversationId: 'c1' }, { conversationId: 'c2' }]);
  });

  it('shows the empty state when there are no conversations', async () => {
    mockApi({});
    renderApp('/chat');
    expect(await screen.findByText('No conversations yet')).toBeInTheDocument();
  });
});
