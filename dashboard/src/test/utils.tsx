import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { App } from '../App';
import { API_URL } from '../config';
import type { SupportMe, Ticket, TicketDetail, TicketPage } from '../api/types';

export interface Call {
  method: string;
  path: string;
  body: unknown;
  headers: Record<string, string>;
}

/** A handler returns envelope data, or `{ status, error }` for a failure. */
export type Reply = unknown | { __status: number; code?: string; message?: string };
type Handler = (call: Call) => Reply | Promise<Reply>;

export const fail = (status: number, message = 'Failed', code = 'ERR') => ({ __status: status, code, message });

function isFailure(r: unknown): r is { __status: number; code?: string; message?: string } {
  return typeof r === 'object' && r !== null && '__status' in r;
}

export const AGENT: SupportMe = { userId: 'agent-1', phone: '9000000001', name: 'Asha Agent' };

/**
 * Mocks fetch. Routes are keyed "METHOD /path" (path without query); the first
 * matching key wins. Unmatched routes 404.
 */
export function mockApi(routes: Record<string, Handler>) {
  const calls: Call[] = [];
  const all: Record<string, Handler> = {
    'GET /support/me': () => AGENT,
    'GET /partner-client-chat/support/conversations': () => [],
    'POST /auth/logout': () => ({}),
    ...routes,
  };
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(API_URL, '');
    const method = init?.method ?? 'GET';
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const call: Call = {
      method,
      path: url,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      headers,
    };
    calls.push(call);
    const handler = all[`${method} ${url.split('?')[0]}`];
    const reply = handler ? await handler(call) : fail(404, `No mock for ${method} ${url}`);
    if (isFailure(reply)) {
      return new Response(JSON.stringify({ success: false, error: { code: reply.code, message: reply.message } }), {
        status: reply.__status,
      });
    }
    return new Response(JSON.stringify({ success: true, data: reply }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return {
    calls,
    callsTo: (method: string, pathPrefix: string) =>
      calls.filter((c) => c.method === method && c.path.split('?')[0] === pathPrefix),
  };
}

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
}

export function renderApp(path: string, { token = 'tok-1' }: { token?: string | null } = {}) {
  if (token) localStorage.setItem('supportToken', token);
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  );
}

export function makeTicket(over: Partial<Ticket> = {}): Ticket {
  return {
    id: 't1',
    number: 12,
    ticketNo: 'MTP-12',
    category: 'KYC',
    categoryLabel: 'KYC issue',
    description: 'Client KYC stuck',
    status: 'OPEN',
    resolvedAt: null,
    resolvedByRole: null,
    reopenableUntil: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    attachmentCount: 0,
    clientCode: 'NSE1',
    client: { id: 'c1', name: 'Karan Client', clientCode: 'NSE1', phone: '8000000001' },
    partner: { id: 'p1', name: 'Ravi Partner', businessName: 'Ravi Wealth', phone: '7000000001', arn: 'ARN-1' },
    ...over,
  };
}

export function makeDetail(over: Partial<TicketDetail> = {}): TicketDetail {
  return {
    ...makeTicket(),
    events: [
      {
        id: 'e1',
        type: 'CREATED',
        fromStatus: null,
        toStatus: 'OPEN',
        title: null,
        note: 'Please help',
        actorRole: 'PARTNER',
        createdAt: '2026-10-01T10:00:00.000Z',
      },
    ],
    attachments: [],
    ...over,
  };
}

export function makePage(items: Ticket[]): TicketPage {
  return {
    items,
    counts: { all: 5, open: 2, inProgress: 2, resolved: 1 },
    page: 1,
    pageSize: 25,
    total: items.length,
  };
}
