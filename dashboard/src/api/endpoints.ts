import { qs, request } from './client';
import type {
  ClientDetail,
  ConversationDetail,
  ConversationRef,
  Paged,
  PartnerDetail,
  PartnerSummary,
  SendOtpResponse,
  SupportChatClient,
  SupportConversation,
  SupportMe,
  TicketActivity,
  TicketCategory,
  TicketDetail,
  TicketPage,
  TicketQuery,
  TicketStatusBody,
  TicketUpdateBody,
  VerifyOtpResponse,
} from './types';

const id = encodeURIComponent;

export const api = {
  sendOtp: (phone: string) =>
    request<SendOtpResponse>('/auth/send-otp', { method: 'POST', body: { phone } }),
  verifyOtp: (phone: string, otp: string, requestId: string) =>
    request<VerifyOtpResponse>('/auth/verify-otp', { method: 'POST', body: { phone, otp, requestId } }),
  logout: () => request<unknown>('/auth/logout', { method: 'POST' }),
  me: () => request<SupportMe>('/support/me'),

  ticketCategories: () => request<TicketCategory[]>('/support/tickets/categories'),
  tickets: (q: TicketQuery = {}) => request<TicketPage>(`/support/tickets${qs({ ...q })}`),
  ticketActivity: (limit = 20) => request<TicketActivity[]>(`/support/tickets/activity${qs({ limit })}`),
  ticket: (ticketId: string) => request<TicketDetail>(`/support/tickets/${id(ticketId)}`),
  setTicketStatus: (ticketId: string, body: TicketStatusBody) =>
    request<TicketDetail>(`/support/tickets/${id(ticketId)}/status`, { method: 'POST', body }),
  postTicketUpdate: (ticketId: string, body: TicketUpdateBody) =>
    request<TicketDetail>(`/support/tickets/${id(ticketId)}/updates`, { method: 'POST', body }),

  partners: (q: string, page: number) => request<Paged<PartnerSummary>>(`/support/partners${qs({ q, page })}`),
  partner: (partnerId: string) => request<PartnerDetail>(`/support/partners/${id(partnerId)}`),
  client: (clientId: string) => request<ClientDetail>(`/support/clients/${id(clientId)}`),

  conversations: () => request<SupportConversation[]>('/partner-client-chat/support/conversations'),
  chatClients: (search: string) =>
    request<SupportChatClient[]>(`/partner-client-chat/support/clients${qs({ search })}`),
  openClientConversation: (clientId: string) =>
    request<ConversationRef>(`/partner-client-chat/support/clients/${id(clientId)}/conversation`, { method: 'POST' }),
  conversation: (conversationId: string) =>
    request<ConversationDetail>(`/partner-client-chat/conversations/${id(conversationId)}`),
};
