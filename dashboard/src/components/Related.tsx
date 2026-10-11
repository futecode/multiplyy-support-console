import { useCallback, useState } from 'react';
import { api } from '../api/endpoints';
import type { SupportConversation } from '../api/types';
import { useAsync } from '../hooks/useAsync';
import { useRealtime, useTicketUpdates } from '../realtime/RealtimeContext';
import { ConversationList } from './ConversationList';
import { Pagination } from './Pagination';
import { AsyncBlock, Empty } from './States';
import { TicketTable } from './TicketTable';

export function RelatedTickets({ clientId, partnerId }: { clientId?: string; partnerId?: string }) {
  const [page, setPage] = useState(1);
  const tickets = useAsync(useCallback(() => api.tickets({ clientId, partnerId, page }), [clientId, partnerId, page]));
  const { refresh } = tickets;
  useTicketUpdates(() => void refresh());

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Tickets{tickets.data ? ` (${tickets.data.total})` : ''}</h2>
      </div>
      <AsyncBlock state={tickets} what="tickets">
        {(data) =>
          data.items.length ? (
            <>
              <TicketTable tickets={data.items} compact />
              {data.total > data.pageSize && (
                <Pagination page={data.page} pageSize={data.pageSize} total={data.total} noun="tickets" onPage={setPage} />
              )}
            </>
          ) : (
            <Empty icon="ticket">No tickets found</Empty>
          )
        }
      </AsyncBlock>
    </section>
  );
}

export function RelatedConversations({ match }: { match: (c: SupportConversation) => boolean }) {
  const { conversations } = useRealtime();
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Conversations</h2>
      </div>
      <AsyncBlock state={conversations} what="conversations">
        {(all) => {
          const list = all.filter(match);
          return list.length ? <ConversationList conversations={list} /> : <Empty icon="chat">No conversations yet</Empty>;
        }}
      </AsyncBlock>
    </section>
  );
}
