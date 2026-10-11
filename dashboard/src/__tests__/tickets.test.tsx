import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TicketDetail } from '../api/types';
import { lastDesk, resetSockets } from '../test/fakeSocket';
import { fail, makeDetail, makePage, makeTicket, mockApi, renderApp } from '../test/utils';

vi.mock('../realtime/socket', async () => (await import('../test/fakeSocket')).fakeSocketModule);

beforeEach(resetSockets);

describe('tickets list', () => {
  it('loads tickets and the status tab changes the query', async () => {
    const api = mockApi({
      'GET /support/tickets/categories': () => [{ code: 'KYC', label: 'KYC issue' }],
      'GET /support/tickets': () =>
        makePage([makeTicket(), makeTicket({ id: 't2', ticketNo: 'MTP-13', client: null, attachmentCount: 2 })]),
    });
    const user = userEvent.setup();
    renderApp('/tickets');

    expect(await screen.findByRole('link', { name: 'MTP-12' })).toBeInTheDocument();
    expect(screen.getByText('Partner (self)')).toBeInTheDocument();
    expect(screen.getByText('📎 2')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Open\s*2/ })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Open/ }));
    await waitFor(() => {
      const last = api.callsTo('GET', '/support/tickets').at(-1);
      expect(last?.path).toContain('status=OPEN');
      expect(last?.path).toContain('page=1');
    });
  });

  it('shows the empty state and the error state with retry', async () => {
    let attempt = 0;
    mockApi({
      'GET /support/tickets/categories': () => [],
      'GET /support/tickets': () => (++attempt === 1 ? fail(500, 'Boom') : makePage([])),
    });
    const user = userEvent.setup();
    renderApp('/tickets');

    expect(await screen.findByText('Unable to load tickets. Try again.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No tickets found')).toBeInTheDocument();
  });

  it('refetches the list when the desk socket pushes ticket_updated', async () => {
    const api = mockApi({
      'GET /support/tickets/categories': () => [],
      'GET /support/tickets': () => makePage([makeTicket()]),
    });
    renderApp('/tickets');
    await screen.findByRole('link', { name: 'MTP-12' });
    const before = api.callsTo('GET', '/support/tickets').length;
    lastDesk().serverEmit('ticket_updated', { ticketId: 't1', change: 'NOTE' });
    await waitFor(() => expect(api.callsTo('GET', '/support/tickets').length).toBe(before + 1));
  });
});

describe('dashboard', () => {
  it('shows counts, recent tickets and the activity feed', async () => {
    mockApi({
      'GET /support/tickets': () => makePage([makeTicket()]),
      'GET /support/tickets/activity': () => [
        {
          id: 'ev1',
          ticketId: 't1',
          ticketNo: 'MTP-12',
          categoryLabel: 'KYC issue',
          ticketStatus: 'OPEN',
          type: 'REOPENED',
          fromStatus: 'RESOLVED',
          toStatus: 'OPEN',
          title: null,
          note: 'Still broken',
          actorRole: 'PARTNER',
          createdAt: '2026-10-01T11:00:00.000Z',
        },
      ],
    });
    renderApp('/dashboard');
    expect(await screen.findByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('All tickets').nextSibling).toHaveTextContent('5');
    expect(await screen.findByText('Reopened by partner')).toBeInTheDocument();
    expect(screen.getByText('Still broken')).toBeInTheDocument();
    expect(await screen.findByText('No conversations yet')).toBeInTheDocument();
  });
});

describe('ticket detail', () => {
  it('renders the ticket; resolve requires a note, then confirm, then posts the status', async () => {
    const resolved: TicketDetail = makeDetail({
      status: 'RESOLVED',
      resolvedByRole: 'SUPPORT',
      resolvedAt: '2026-10-02T10:00:00.000Z',
      reopenableUntil: '2026-10-04T10:00:00.000Z',
    });
    const api = mockApi({
      'GET /support/tickets/t1': () => makeDetail(),
      'POST /support/tickets/t1/status': () => resolved,
    });
    const user = userEvent.setup();
    renderApp('/tickets/t1');

    expect(await screen.findByRole('heading', { name: 'KYC issue' })).toBeInTheDocument();
    expect(screen.getByText('Client KYC stuck')).toBeInTheDocument();
    expect(screen.getByText('Ticket raised')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Resolve' }));
    expect(screen.getByRole('alert')).toHaveTextContent('A resolution note is required');
    expect(api.callsTo('POST', '/support/tickets/t1/status')).toHaveLength(0);

    await user.type(screen.getByLabelText('Resolution note'), 'Fixed KYC');
    await user.click(screen.getByRole('button', { name: 'Resolve' }));
    expect(api.callsTo('POST', '/support/tickets/t1/status')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Confirm resolve' }));

    await waitFor(() =>
      expect(api.callsTo('POST', '/support/tickets/t1/status')[0]?.body).toEqual({ status: 'RESOLVED', note: 'Fixed KYC' }),
    );
    expect(await screen.findByText(/Partner can reopen until/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Ticket actions' })).not.toBeInTheDocument();
  });

  it('start work posts IN_PROGRESS', async () => {
    const api = mockApi({
      'GET /support/tickets/t1': () => makeDetail(),
      'POST /support/tickets/t1/status': () => makeDetail({ status: 'IN_PROGRESS' }),
    });
    const user = userEvent.setup();
    renderApp('/tickets/t1');
    await user.click(await screen.findByRole('button', { name: 'Start work' }));
    await waitFor(() =>
      expect(api.callsTo('POST', '/support/tickets/t1/status')[0]?.body).toEqual({ status: 'IN_PROGRESS' }),
    );
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Start work' })).not.toBeInTheDocument());
  });

  it('on 409 shows the message, refetches, and keeps the typed note', async () => {
    const api = mockApi({
      'GET /support/tickets/t1': () => makeDetail(),
      'POST /support/tickets/t1/updates': () => fail(409, 'This ticket was just updated. Refresh and try again.'),
    });
    const user = userEvent.setup();
    renderApp('/tickets/t1');
    await user.type(await screen.findByLabelText('Update note'), 'Working on it');
    await user.click(screen.getByRole('button', { name: 'Post update' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This ticket was just updated. Refresh and try again.');
    await waitFor(() => expect(api.callsTo('GET', '/support/tickets/t1')).toHaveLength(2));
    expect(screen.getByLabelText('Update note')).toHaveValue('Working on it');
  });

  it('shows "Closed by partner" and no actions when the partner closed it', async () => {
    mockApi({ 'GET /support/tickets/t1': () => makeDetail({ status: 'RESOLVED', resolvedByRole: 'PARTNER' }) });
    renderApp('/tickets/t1');
    expect(await screen.findByText(/Closed by partner/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
  });

  it('renders image attachments as thumbnails and PDFs as file tiles', async () => {
    mockApi({
      'GET /support/tickets/t1': () =>
        makeDetail({
          attachmentCount: 2,
          attachments: [
            { id: 'a1', fileName: 'screen.png', mimeType: 'image/png', byteSize: 2048, url: 'https://s3/img?sig=1' },
            { id: 'a2', fileName: 'statement.pdf', mimeType: 'application/pdf', byteSize: 4096, url: 'https://s3/pdf?sig=1' },
          ],
        }),
    });
    renderApp('/tickets/t1');

    const img = await screen.findByRole('img', { name: 'screen.png' });
    expect(img).toHaveAttribute('src', 'https://s3/img?sig=1');
    const pdfLink = screen.getByRole('link', { name: 'Open statement.pdf' });
    expect(pdfLink).toHaveAttribute('href', 'https://s3/pdf?sig=1');
    expect(pdfLink).toHaveAttribute('target', '_blank');
    expect(within(pdfLink).queryByRole('img')).not.toBeInTheDocument();
    expect(within(pdfLink).getByText('PDF')).toBeInTheDocument();
  });
});
