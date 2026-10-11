import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import type { TicketCounts, TicketStatus } from '../api/types';
import { Pagination } from '../components/Pagination';
import { AsyncBlock, Empty } from '../components/States';
import { TicketTable } from '../components/TicketTable';
import { useAsync } from '../hooks/useAsync';
import { useTicketUpdates } from '../realtime/RealtimeContext';

const TABS: { status: TicketStatus | ''; label: string; count: keyof TicketCounts }[] = [
  { status: '', label: 'All', count: 'all' },
  { status: 'OPEN', label: 'Open', count: 'open' },
  { status: 'IN_PROGRESS', label: 'In progress', count: 'inProgress' },
  { status: 'RESOLVED', label: 'Resolved', count: 'resolved' },
];

const isStatus = (s: string | null): s is TicketStatus => s === 'OPEN' || s === 'IN_PROGRESS' || s === 'RESOLVED';

const isShortTextTerm = (term: string) => {
  const t = term.trim();
  return t.length > 0 && t.length < 3 && !/^(mtp-?)?\d+$/i.test(t);
};

export function TicketsPage() {
  const [params, setParams] = useSearchParams();
  const rawStatus = params.get('status');
  const status = isStatus(rawStatus) ? rawStatus : undefined;
  const category = params.get('category') ?? '';
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);

  const categories = useAsync(api.ticketCategories);
  const tickets = useAsync(
    useCallback(() => api.tickets({ status, category: category || undefined, q: q || undefined, page }), [status, category, q, page]),
  );
  const { refresh } = tickets;
  useTicketUpdates(() => void refresh());

  /** Changing any filter goes back to page 1. */
  const update = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    if (!('page' in next)) sp.delete('page');
    setParams(sp);
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    update({ q: search.trim() || undefined });
  };

  const counts = tickets.data?.counts;

  return (
    <div className="stack">
      <div className="tabs" role="tablist" aria-label="Ticket status">
        {TABS.map((t) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={(status ?? '') === t.status}
            className={`tab${(status ?? '') === t.status ? ' active' : ''}`}
            onClick={() => update({ status: t.status || undefined })}
          >
            {t.label}
            <span className="tab-count">{counts ? counts[t.count] : '–'}</span>
          </button>
        ))}
      </div>

      <section className="panel">
        <div className="toolbar">
          <select
            aria-label="Category"
            value={category}
            onChange={(e) => update({ category: e.target.value || undefined })}
          >
            <option value="">All categories</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <form onSubmit={onSearch} className="search">
            <input
              type="search"
              aria-label="Search tickets"
              placeholder="MTP-12, or 3+ characters of a name / phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn">
              Search
            </button>
          </form>
          {/* Backend searches names/phones only from 3 characters; ticket numbers always work. */}
          {isShortTextTerm(search) && <p className="muted search-hint">Type 3+ characters to search names or phones.</p>}
        </div>

        <AsyncBlock state={tickets} what="tickets">
          {(data) =>
            data.items.length ? (
              <>
                <TicketTable tickets={data.items} />
                <Pagination
                  page={data.page}
                  pageSize={data.pageSize}
                  total={data.total}
                  noun="tickets"
                  onPage={(p) => update({ page: String(p) })}
                />
              </>
            ) : (
              <Empty icon="ticket" hint="Try another status, category or search term.">
                No tickets found
              </Empty>
            )
          }
        </AsyncBlock>
      </section>
    </div>
  );
}
