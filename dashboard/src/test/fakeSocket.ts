import { act } from '@testing-library/react';

type Handler = (payload: unknown) => void;

/** Minimal stand-in for a socket.io-client Socket. */
export class FakeSocket {
  connected = true;
  emitted: { event: string; payload: unknown }[] = [];
  disconnected = false;
  private handlers = new Map<string, Set<Handler>>();

  constructor(readonly namespace: string) {}

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)?.add(handler);
    return this;
  }

  off(event: string, handler: Handler) {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  emit(event: string, payload: unknown) {
    this.emitted.push({ event, payload });
    return this;
  }

  disconnect() {
    this.connected = false;
    this.disconnected = true;
    return this;
  }

  /** Simulates the server pushing an event. */
  serverEmit(event: string, payload?: unknown) {
    act(() => {
      this.handlers.get(event)?.forEach((h) => h(payload));
    });
  }

  emitsOf(event: string) {
    return this.emitted.filter((e) => e.event === event).map((e) => e.payload);
  }
}

export const sockets: { chat: FakeSocket[]; desk: FakeSocket[] } = { chat: [], desk: [] };

export function resetSockets() {
  sockets.chat = [];
  sockets.desk = [];
}

export const lastChat = () => {
  const s = sockets.chat[sockets.chat.length - 1];
  if (!s) throw new Error('No chat socket created');
  return s;
};

export const lastDesk = () => {
  const s = sockets.desk[sockets.desk.length - 1];
  if (!s) throw new Error('No desk socket created');
  return s;
};

/** Replacement for src/realtime/socket.ts (use with vi.mock). */
export const fakeSocketModule = {
  connectChat: () => {
    const s = new FakeSocket('/chat');
    sockets.chat.push(s);
    return s;
  },
  connectDesk: () => {
    const s = new FakeSocket('/support-desk');
    sockets.desk.push(s);
    return s;
  },
};
