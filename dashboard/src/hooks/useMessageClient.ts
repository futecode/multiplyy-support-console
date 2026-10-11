import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NETWORK_MESSAGE } from '../api/client';
import { api } from '../api/endpoints';
import { toApiError } from '../auth/AuthContext';
import { useRealtime } from '../realtime/RealtimeContext';

/** "Message client": go to the existing chat, or open one first. */
export function useMessageClient() {
  const navigate = useNavigate();
  const { conversations } = useRealtime();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (clientId: string, conversationId?: string | null) => {
    if (conversationId) return navigate(`/chat?conversation=${encodeURIComponent(conversationId)}`);
    setBusy(clientId);
    setError(null);
    try {
      const conversation = await api.openClientConversation(clientId);
      await conversations.refresh();
      navigate(`/chat?conversation=${encodeURIComponent(conversation.id)}`);
    } catch (e) {
      const err = toApiError(e);
      setError(err.isNetwork ? NETWORK_MESSAGE : `Unable to open a chat: ${err.message}`);
    } finally {
      setBusy(null);
    }
  };

  return { open, busy, error };
}
