# Multiplyy Support Desk

The web app support staff use to work partner tickets, chat with clients, and look up clients and partners.

**Stack:** Vite · React 18 · TypeScript (strict) · react-router v6 · socket.io-client v4 · plain CSS · Vitest.
**Backend:** `multiplyy_be` (NestJS). This app has no backend of its own; every screen reads the real API.

> The legacy single-page console (`../index.html`) is kept as-is. This folder is the new dashboard.

---

## Quick start

```bash
npm install
cp .env.example .env        # point at your backend (see Environment)
npm run dev                 # http://localhost:5173
```

You can only sign in with a phone number listed in the backend's `SUPPORT_PHONES` or `ADMIN_PHONES`.
Anyone else gets "This account doesn't have support access". The dev origin (`http://localhost:5173`)
must be allowed in the backend's `CORS_ORIGINS`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check, then build static files into `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm test` | Vitest (add `-- --run` for a single run) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (typescript-eslint + react-hooks) |

Run `typecheck`, `lint`, `test -- --run` and `build` before pushing.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5656/api/v1` | REST base URL (includes `/api/v1`) |
| `VITE_SOCKET_URL` | `http://localhost:5656` | Socket.IO origin; the app uses the `/chat` and `/support-desk` namespaces |

Values are baked in **at build time**, so build once per environment (staging, production).

---

## Project structure

```
dashboard/
├── index.html              # HTML shell: fonts, favicon
├── public/                 # copied as-is into dist/ (favicon.svg)
└── src/
    ├── main.tsx            # entry: router + global styles
    ├── App.tsx             # top-level routes: /login + the signed-in shell
    ├── routes.tsx          # ★ every signed-in page: path, component, title, sidebar entry
    ├── config.ts           # reads VITE_* env vars
    │
    ├── api/                # talking to the backend
    │   ├── client.ts       #   fetch wrapper: token, {success,data} envelope, ApiError, global 401
    │   ├── endpoints.ts    #   one typed function per endpoint (`api.tickets(query)`)
    │   └── types.ts        #   response types: mirror the backend DTOs
    │
    ├── auth/               # session
    │   ├── AuthContext.tsx #   login (send-otp → verify-otp → /support/me), logout, current agent
    │   └── RequireAuth.tsx #   route guard for signed-in pages
    │
    ├── realtime/           # sockets
    │   ├── socket.ts       #   socket factory (auth token, namespaces)
    │   └── RealtimeContext.tsx  # /support-desk (ticket_updated) + /chat, unread total, connection state
    │
    ├── pages/              # one file per screen (listed in routes.tsx)
    ├── components/         # reusable UI: Layout, tables, badges, states, icons…
    ├── hooks/              # useAsync (load/error/retry), useMessageClient
    ├── utils/format.ts     # dates, labels, initials, sorting helpers
    ├── assets/             # images imported from code (logo.svg)
    │
    ├── styles/             # all CSS, imported once via styles/index.css
    │   ├── index.css       #   import order (tokens first, responsive last)
    │   ├── tokens.css      #   ★ colours, fonts, spacing, radius, shadows + base element styles
    │   ├── layout/         #   shell (sidebar, header), layout helpers
    │   ├── components/     #   buttons, panels/cards, tabs, tables, badges, states
    │   ├── pages/          #   login, dashboard, ticket-detail, chat
    │   └── responsive.css  #   breakpoints (1280 / 1100 / 900 / 760 / 480 px)
    │
    ├── test/               # test helpers: setup, render utils, fake socket
    └── __tests__/          # auth, tickets, chat tests
```

## Design system

- **Fonts:** Inter for interface text and data, Poppins for headings and brand, JetBrains Mono for IDs
  (ticket numbers, client codes, ARNs). They're defined once in `styles/tokens.css` (`--font`, `--font-heading`, `--mono`).
- **Colours, spacing, radius, shadows:** CSS variables in `styles/tokens.css`. Use the variables, never raw hex in components.
- **Status colours:** OPEN = amber, IN_PROGRESS = blue, RESOLVED = green (`components/Badges.tsx`).
- **Icons:** hand-written SVGs in `components/Icon.tsx` (no icon package).
- **States:** every data view uses `components/States.tsx` (loading skeleton, empty, error with Retry).

---

## How to…

### Add a page
1. Create `src/pages/MyPage.tsx`.
2. Add one entry to `APP_ROUTES` in `src/routes.tsx`: `path`, `element`, `title`, `subtitle`.
   Add `nav: { label, icon }` to show it in the sidebar.
3. If it needs its own styles, create `src/styles/pages/my-page.css` and import it in
   `styles/index.css`, **before** `responsive.css`.

### Call a new backend endpoint
1. Add the response type to `src/api/types.ts`, matching the backend DTO field for field.
2. Add a typed function to `src/api/endpoints.ts`.
3. In the page, load it with `useAsync(() => api.myEndpoint(...))` and render `<AsyncBlock>` for loading, error and empty states.

Don't use `as any`. If the backend is missing a field, fix the backend DTO; don't fake it in the frontend.

### Change colours, fonts or spacing
Edit the variables in `src/styles/tokens.css`; the whole app follows.

### Change the sidebar
Order and labels come from `APP_ROUTES` (`nav`). Styles are in `styles/layout/shell.css`.

### Add an icon
Add a path to `PATHS` in `src/components/Icon.tsx`, then use `<Icon name="…" />`.

---

## How it works

**Sign-in**
1. `POST /auth/send-otp` returns a `requestId`.
2. `POST /auth/verify-otp` with `{ phone, otp, requestId }` returns a session token.
3. `GET /support/me` decides access:
   - **200:** signed in.
   - **403:** not support staff, so the session is cleared.
   - **401 on any later request:** the session is cleared and the user goes back to `/login`, then returns to the page they wanted after signing in.

**Live updates**
- `/support-desk` socket: `ticket_updated { ticketId, change }` makes lists, the dashboard and the open ticket refetch.
  A refresh never clears a note the agent is typing.
- `/chat` socket:
  - When a thread opens, the app sends `join_conversation`; when the agent leaves it, `leave_conversation`.
    Joining marks messages read, so the app is only ever joined to the open thread.
  - `send_message`, `new_message` and `message_read` carry the messages themselves.
  - The inbox list also refreshes every 30 seconds.

**Business rules shown in the UI** (enforced by the backend)
- Ticket statuses are OPEN, IN_PROGRESS and RESOLVED only. There's no CLOSED status and no assignment feature.
- Resolving requires a note. After support resolves a ticket, the partner can reopen it until `reopenableUntil` (48 hours).
- Attachments are short-lived signed S3 links; the app refreshes them before they expire.

### Backend endpoints used

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/send-otp`, `POST /auth/verify-otp`, `POST /auth/logout`, `GET /support/me` |
| Tickets | `GET /support/tickets` (status, category, q, clientId, partnerId, page), `GET /support/tickets/:id`, `POST /support/tickets/:id/status`, `POST /support/tickets/:id/updates`, `GET /support/tickets/categories`, `GET /support/tickets/activity` |
| Clients / partners | `GET /partner-client-chat/support/clients`, `GET /support/clients/:id`, `GET /support/partners`, `GET /support/partners/:id` |
| Chat | `GET /partner-client-chat/support/conversations`, `POST /partner-client-chat/support/clients/:clientId/conversation`, socket `/chat` |

All of them are support-only on the backend (`@SupportOnly()`). Hiding a button in the UI is never the access control.

---

## Build & host

```bash
npm run build      # writes dist/
```

`dist/` is a static single-page app; host it on any static host (S3 + CloudFront, Netlify, Nginx…).

**The host must send unknown paths to `/index.html`** (SPA fallback), or deep links like `/tickets/123` break on reload:

- **Nginx:** `try_files $uri /index.html;`
- **Netlify:** `/*  /index.html  200` in `_redirects`
- **S3 + CloudFront:** custom error responses 403/404 → `/index.html` with status 200

Also make sure the dashboard's domain is in the backend's `CORS_ORIGINS`.
