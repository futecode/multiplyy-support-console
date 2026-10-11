/** Response shapes of the NestJS backend (data inside the { success, data } envelope). */

export type Role = 'CLIENT' | 'PARTNER' | 'SUPPORT' | 'SYSTEM';
export type ActorRole = 'PARTNER' | 'SUPPORT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type TicketEventType = 'CREATED' | 'NOTE' | 'STATUS_CHANGED' | 'REOPENED';

// --- Auth ---

export interface SendOtpResponse {
  requestId: string;
  expiresInSeconds: number;
  retryAfterSeconds: number;
  devOtp?: string;
}

export interface VerifyOtpResponse {
  sessionToken: string;
}

export interface SupportMe {
  userId: string;
  phone: string;
  name: string | null;
}

// --- Tickets ---

export interface TicketCategory {
  code: string;
  label: string;
}

export interface TicketClient {
  id: string;
  name: string | null;
  clientCode: string | null;
  phone: string;
}

export interface TicketPartner {
  id: string;
  name: string | null;
  businessName: string | null;
  phone: string;
  arn: string;
}

export interface Ticket {
  id: string;
  number: number;
  ticketNo: string;
  category: string;
  categoryLabel: string;
  description: string;
  status: TicketStatus;
  resolvedAt: string | null;
  resolvedByRole: ActorRole | null;
  reopenableUntil: string | null;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
  clientCode: string | null;
  client: TicketClient | null;
  partner: TicketPartner;
}

export interface TicketEvent {
  id: string;
  type: TicketEventType;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus | null;
  title: string | null;
  note: string | null;
  actorRole: ActorRole;
  createdAt: string;
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  url: string | null;
}

export interface TicketDetail extends Ticket {
  events: TicketEvent[];
  attachments: TicketAttachment[];
}

export interface TicketCounts {
  all: number;
  open: number;
  inProgress: number;
  resolved: number;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface TicketPage extends Paged<Ticket> {
  counts: TicketCounts;
}

export interface TicketActivity {
  id: string;
  ticketId: string;
  ticketNo: string;
  categoryLabel: string;
  ticketStatus: TicketStatus;
  type: TicketEventType;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus | null;
  title: string | null;
  note: string | null;
  actorRole: ActorRole;
  createdAt: string;
}

export interface TicketQuery {
  status?: TicketStatus;
  category?: string;
  q?: string;
  clientId?: string;
  partnerId?: string;
  page?: number;
}

export interface TicketStatusBody {
  status: 'IN_PROGRESS' | 'RESOLVED';
  title?: string;
  note?: string;
}

export interface TicketUpdateBody {
  title?: string;
  note: string;
}

// --- Desk lookups ---

export interface PartnerSummary {
  id: string;
  userId: string;
  name: string | null;
  businessName: string | null;
  phone: string;
  arn: string;
  status: string;
  activeClientCount: number;
  createdAt: string;
}

export interface PartnerClient {
  userId: string;
  name: string | null;
  phone: string;
  clientCode: string | null;
}

export interface PartnerDetail extends PartnerSummary {
  euin: string | null;
  city: string | null;
  state: string | null;
  clients: PartnerClient[];
}

export interface ClientDetail {
  userId: string;
  phone: string;
  name: string | null;
  clientCode: string | null;
  partner: { id: string; userId: string; name: string | null; phone: string } | null;
}

// --- Chat ---

export interface ChatPartnerRef {
  partnerId: string;
  userId: string;
  name: string | null;
  phone: string | null;
}

export interface ChatParticipant {
  userId: string;
  role: Role;
}

export interface SupportConversation {
  id: string;
  clientId: string;
  partnerId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  client: { userId: string; phone: string | null; name: string | null; clientCode?: string | null };
  partner: ChatPartnerRef | null;
  participants: ChatParticipant[];
  lastMessage: {
    id: string;
    body: string;
    senderRole: Role;
    createdAt: string;
    readAt: string | null;
  } | null;
  unreadFromClient: number;
}

export interface SupportChatClient {
  userId: string;
  phone: string | null;
  name: string | null;
  clientCode: string | null;
  conversationId: string | null;
  partner: ChatPartnerRef | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderRole: Role;
  body: string;
  attachmentUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ConversationDetail {
  id: string;
  clientId: string;
  partnerId: string | null;
  status: string;
  createdAt: string;
  clientName: string | null;
  clientCode: string | null;
  clientPhone: string | null;
  participants: ChatParticipant[];
  messages: ChatMessage[];
}

export interface ConversationRef {
  id: string;
}
