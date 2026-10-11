import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, makePage, mockApi, renderApp } from '../test/utils';
import { resetSockets, sockets } from '../test/fakeSocket';

vi.mock('../realtime/socket', async () => (await import('../test/fakeSocket')).fakeSocketModule);

const location = () => screen.getByTestId('location').textContent;

beforeEach(resetSockets);

describe('auth and route guard', () => {
  it('redirects an unauthenticated visitor to /login', async () => {
    mockApi({});
    renderApp('/tickets', { token: null });
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(location()).toBe('/login');
  });

  it('logs in with send-otp then verify-otp (echoing requestId) and returns to the intended page', async () => {
    const api = mockApi({
      'POST /auth/send-otp': () => ({ requestId: 'req-42', expiresInSeconds: 300, retryAfterSeconds: 30 }),
      'POST /auth/verify-otp': () => ({ sessionToken: 'new-token' }),
      'GET /support/tickets': () => makePage([]),
      'GET /support/tickets/categories': () => [],
    });
    const user = userEvent.setup();
    renderApp('/tickets', { token: null });

    await user.type(await screen.findByLabelText('Phone number'), '9000000001');
    await user.click(screen.getByRole('button', { name: 'Send OTP' }));
    await user.type(await screen.findByLabelText('OTP'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify & sign in' }));

    await waitFor(() => expect(location()).toBe('/tickets'));
    expect(api.callsTo('POST', '/auth/send-otp')[0]?.body).toEqual({ phone: '9000000001' });
    expect(api.callsTo('POST', '/auth/verify-otp')[0]?.body).toEqual({
      phone: '9000000001',
      otp: '123456',
      requestId: 'req-42',
    });
    const me = api.callsTo('GET', '/support/me')[0];
    expect(me?.headers.Authorization).toBe('Bearer new-token');
    expect(localStorage.getItem('supportToken')).toBe('new-token');
  });

  it('blocks a non-support account (403 on /support/me) and clears the session', async () => {
    mockApi({
      'POST /auth/send-otp': () => ({ requestId: 'req-1', expiresInSeconds: 300, retryAfterSeconds: 30 }),
      'POST /auth/verify-otp': () => ({ sessionToken: 'partner-token' }),
      'GET /support/me': () => fail(403, 'Forbidden', 'FORBIDDEN'),
    });
    const user = userEvent.setup();
    renderApp('/login', { token: null });

    await user.type(screen.getByLabelText('Phone number'), '9111111111');
    await user.click(screen.getByRole('button', { name: 'Send OTP' }));
    await user.type(await screen.findByLabelText('OTP'), '000000');
    await user.click(screen.getByRole('button', { name: 'Verify & sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("This account doesn't have support access");
    expect(localStorage.getItem('supportToken')).toBeNull();
    expect(location()).toBe('/login');
  });

  it('blocks a stored non-support session on app load', async () => {
    mockApi({ 'GET /support/me': () => fail(403, 'Forbidden') });
    renderApp('/dashboard', { token: 'stale' });
    expect(await screen.findByRole('alert')).toHaveTextContent("This account doesn't have support access");
    expect(localStorage.getItem('supportToken')).toBeNull();
    expect(location()).toBe('/login');
  });

  it('a 401 from any call clears the session and redirects to /login', async () => {
    mockApi({
      'GET /support/tickets': () => fail(401, 'Unauthorized'),
      'GET /support/tickets/categories': () => [],
    });
    renderApp('/tickets');
    await waitFor(() => expect(location()).toBe('/login'));
    expect(localStorage.getItem('supportToken')).toBeNull();
  });

  it('logout calls the API, clears the session and disconnects sockets', async () => {
    const api = mockApi({});
    const user = userEvent.setup();
    renderApp('/profile');

    expect(await screen.findByText('9000000001', { selector: 'dd' })).toBeInTheDocument();
    const [headerLogout] = screen.getAllByRole('button', { name: 'Logout' });
    if (!headerLogout) throw new Error('no logout button');
    await user.click(headerLogout);

    await waitFor(() => expect(location()).toBe('/login'));
    expect(api.callsTo('POST', '/auth/logout')).toHaveLength(1);
    expect(localStorage.getItem('supportToken')).toBeNull();
    expect(sockets.chat.every((s) => s.disconnected)).toBe(true);
    expect(sockets.desk.every((s) => s.disconnected)).toBe(true);
  });
});
