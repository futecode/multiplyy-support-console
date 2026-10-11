import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { Pagination } from '../components/Pagination';
import { AsyncBlock, Empty } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { formatDate } from '../utils/format';

export function PartnersPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  const navigate = useNavigate();

  const partners = useAsync(useCallback(() => api.partners(q, page), [q, page]));

  const go = (nextQ: string, nextPage: number) => {
    const sp = new URLSearchParams();
    if (nextQ) sp.set('q', nextQ);
    if (nextPage > 1) sp.set('page', String(nextPage));
    setParams(sp);
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    go(search.trim(), 1);
  };

  return (
    <section className="panel">
      <div className="toolbar">
        <form onSubmit={onSearch} className="search">
          <input
            type="search"
            aria-label="Search partners"
            placeholder="3+ characters of name, business, phone or ARN"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn">
            Search
          </button>
        </form>
        {/* Backend ignores search terms shorter than 3 characters. */}
        {search.trim().length > 0 && search.trim().length < 3 && (
          <p className="muted search-hint">Type 3+ characters to search.</p>
        )}
      </div>
      <AsyncBlock state={partners} what="partners">
        {(data) =>
          data.items.length ? (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Business</th>
                      <th>Phone</th>
                      <th>ARN</th>
                      <th>Status</th>
                      <th>Active clients</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((p) => (
                      <tr key={p.id} className="clickable" onClick={() => navigate(`/partners/${p.id}`)}>
                        <td>
                          <Link to={`/partners/${p.id}`} onClick={(e) => e.stopPropagation()}>
                            {p.name || p.phone}
                          </Link>
                        </td>
                        <td>
                          <div className="truncate" title={p.businessName ?? undefined}>
                            {p.businessName ?? '—'}
                          </div>
                        </td>
                        <td className="nowrap">{p.phone}</td>
                        <td className="mono">{p.arn}</td>
                        <td>
                          <span className="chip">{p.status}</span>
                        </td>
                        <td className="num">{p.activeClientCount}</td>
                        <td className="nowrap">{formatDate(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={data.page} pageSize={data.pageSize} total={data.total} noun="partners" onPage={(p) => go(q, p)} />
            </>
          ) : (
            <Empty icon="briefcase" hint="Search by name, business, phone or ARN.">
              No partners found
            </Empty>
          )
        }
      </AsyncBlock>
    </section>
  );
}
