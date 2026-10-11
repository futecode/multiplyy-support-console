import { useState, type FormEvent } from 'react';
import { NETWORK_MESSAGE } from '../api/client';
import { api } from '../api/endpoints';
import type { TicketDetail } from '../api/types';
import { toApiError } from '../auth/AuthContext';

const CONFLICT_MESSAGE = 'This ticket was just updated. Refresh and try again.';

/**
 * Start work / Post update / Resolve. Form state lives here, so a live refetch
 * of the ticket above never wipes what the agent is typing.
 */
export function TicketActions({
  ticket,
  onUpdated,
  onConflict,
}: {
  ticket: TicketDetail;
  onUpdated: (t: TicketDetail) => void;
  onConflict: () => void;
}) {
  const [startTitle, setStartTitle] = useState('');
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateNote, setUpdateNote] = useState('');
  const [resolveNote, setResolveNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<null | 'start' | 'update' | 'resolve'>(null);
  const [error, setError] = useState<string | null>(null);

  if (ticket.status === 'RESOLVED') return null;

  const run = async (kind: 'start' | 'update' | 'resolve', call: () => Promise<TicketDetail>, reset: () => void) => {
    setBusy(kind);
    setError(null);
    try {
      onUpdated(await call());
      reset();
    } catch (e) {
      const err = toApiError(e);
      if (err.status === 409) {
        setError(err.message || CONFLICT_MESSAGE);
        onConflict();
      } else {
        setError(err.isNetwork ? NETWORK_MESSAGE : err.message);
      }
    } finally {
      setBusy(null);
    }
  };

  const start = () =>
    run('start', () => api.setTicketStatus(ticket.id, { status: 'IN_PROGRESS', title: startTitle.trim() || undefined }), () =>
      setStartTitle(''),
    );

  const postUpdate = (e: FormEvent) => {
    e.preventDefault();
    if (!updateNote.trim()) return setError('A note is required to post an update.');
    void run(
      'update',
      () => api.postTicketUpdate(ticket.id, { title: updateTitle.trim() || undefined, note: updateNote.trim() }),
      () => {
        setUpdateTitle('');
        setUpdateNote('');
      },
    );
  };

  const askResolve = (e: FormEvent) => {
    e.preventDefault();
    if (!resolveNote.trim()) return setError('A resolution note is required to resolve this ticket.');
    setError(null);
    setConfirming(true);
  };

  const resolve = () =>
    run('resolve', () => api.setTicketStatus(ticket.id, { status: 'RESOLVED', note: resolveNote.trim() }), () => {
      setResolveNote('');
      setConfirming(false);
    });

  return (
    <section className="panel actions" aria-label="Ticket actions">
      <div className="panel-head">
        <h2>Actions</h2>
      </div>
      <div className="panel-body stack">
        {ticket.status === 'OPEN' && (
          <div className="action">
            <h3>Start work</h3>
            <p className="muted small">Moves the ticket to In progress and lets the partner know.</p>
            <div className="row-gap">
              <input
                aria-label="Start work title"
                placeholder="Title (optional)"
                value={startTitle}
                onChange={(e) => setStartTitle(e.target.value)}
              />
              <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={() => void start()}>
                {busy === 'start' ? 'Starting…' : 'Start work'}
              </button>
            </div>
          </div>
        )}

        <form className="action" onSubmit={postUpdate}>
          <h3>Post update</h3>
          <input
            aria-label="Update title"
            placeholder="Title (optional)"
            value={updateTitle}
            onChange={(e) => setUpdateTitle(e.target.value)}
          />
          <textarea
            aria-label="Update note"
            rows={3}
            placeholder="Note for the partner (required)"
            value={updateNote}
            onChange={(e) => setUpdateNote(e.target.value)}
          />
          <div>
            <button type="submit" className="btn" disabled={busy !== null}>
              {busy === 'update' ? 'Posting…' : 'Post update'}
            </button>
          </div>
        </form>

        <form className="action" onSubmit={askResolve}>
          <h3>Resolve</h3>
          <textarea
            aria-label="Resolution note"
            rows={3}
            placeholder="Resolution note (required)"
            value={resolveNote}
            onChange={(e) => {
              setResolveNote(e.target.value);
              setConfirming(false);
            }}
          />
          {confirming ? (
            <div className="confirm" role="alertdialog" aria-label="Confirm resolve">
              <span>Resolve this ticket? The partner can still reopen it for a limited time.</span>
              <div className="row-gap">
                <button type="button" className="btn btn-danger" disabled={busy !== null} onClick={() => void resolve()}>
                  {busy === 'resolve' ? 'Resolving…' : 'Confirm resolve'}
                </button>
                <button type="button" className="btn" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button type="submit" className="btn btn-danger" disabled={busy !== null}>
                Resolve
              </button>
            </div>
          )}
        </form>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
