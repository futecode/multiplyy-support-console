export function Pagination({
  page,
  pageSize,
  total,
  noun,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  noun: string;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / (pageSize || 25)));
  return (
    <nav className="pager" aria-label="Pagination">
      <button type="button" className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ‹ Prev
      </button>
      <span className="muted small">
        Page {page} of {pages} · {total} {noun}
      </span>
      <button type="button" className="btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next ›
      </button>
    </nav>
  );
}
