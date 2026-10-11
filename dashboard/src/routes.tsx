import type { ReactElement } from 'react';
import { matchPath } from 'react-router-dom';
import type { IconName } from './components/Icon';
import { ChatPage } from './pages/ChatPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { ClientsPage } from './pages/ClientsPage';
import { DashboardPage } from './pages/DashboardPage';
import { PartnerDetailPage } from './pages/PartnerDetailPage';
import { PartnersPage } from './pages/PartnersPage';
import { ProfilePage } from './pages/ProfilePage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { TicketsPage } from './pages/TicketsPage';

/**
 * Every signed-in page, in one place. To add a page: create it in pages/,
 * add one entry here (give it `nav` to show it in the sidebar). The router,
 * sidebar and header title all read from this list.
 */
export type AppRoute = {
  path: string;
  element: ReactElement;
  title: string;
  subtitle: string;
  nav?: { label: string; icon: IconName };
};

export const APP_ROUTES: AppRoute[] = [
  {
    path: '/dashboard',
    element: <DashboardPage />,
    title: 'Dashboard',
    subtitle: 'Overview of tickets, activity and chats',
    nav: { label: 'Dashboard', icon: 'dashboard' },
  },
  {
    path: '/tickets',
    element: <TicketsPage />,
    title: 'Tickets',
    subtitle: 'Partner support requests',
    nav: { label: 'Tickets', icon: 'ticket' },
  },
  { path: '/tickets/:id', element: <TicketDetailPage />, title: 'Ticket', subtitle: 'Ticket details, timeline and actions' },
  {
    path: '/chat',
    element: <ChatPage />,
    title: 'Chat',
    subtitle: 'Live conversations with clients',
    nav: { label: 'Chat', icon: 'chat' },
  },
  {
    path: '/clients',
    element: <ClientsPage />,
    title: 'Clients',
    subtitle: 'Find a client or start a chat',
    nav: { label: 'Clients', icon: 'users' },
  },
  { path: '/clients/:id', element: <ClientDetailPage />, title: 'Client', subtitle: 'Client profile, tickets and chats' },
  {
    path: '/partners',
    element: <PartnersPage />,
    title: 'Partners',
    subtitle: 'Registered partners',
    nav: { label: 'Partners', icon: 'briefcase' },
  },
  { path: '/partners/:id', element: <PartnerDetailPage />, title: 'Partner', subtitle: 'Partner profile, clients and tickets' },
  {
    path: '/profile',
    element: <ProfilePage />,
    title: 'Profile',
    subtitle: 'Your support account',
    nav: { label: 'Profile', icon: 'user' },
  },
];

/** The route the current URL belongs to, for the header title. */
export function findRoute(pathname: string): AppRoute | undefined {
  return APP_ROUTES.find((r) => matchPath(r.path, pathname));
}
