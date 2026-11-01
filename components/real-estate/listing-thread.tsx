'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Send, X } from 'lucide-react';
import { fetchThread, markMessagesRead, sendThreadMessage, type ThreadMessage } from '@/lib/real-estate/messaging';

export interface ThreadTarget {
  listingId: string;
  listingTitle: string;
  buyerId: string;
}

interface ListingThreadProps extends ThreadTarget {
  currentUserId: string;
  onClose: () => void;
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function ListingThread({ listingId, listingTitle, buyerId, currentUserId, onClose }: ListingThreadProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    let active = true;
    fetchThread(listingId, buyerId)
      .then((rows) => {
        if (!active) return;
        setMessages(rows);
        setStatus('ready');
        return markMessagesRead(currentUserId, { listingId, buyerId }).catch((cause) => console.error('marking thread read failed', cause));
      })
      .catch((cause) => {
        console.error('thread load failed', cause);
        if (active) setStatus('error');
      });
    return () => { active = false; };
  }, [listingId, buyerId, currentUserId]);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError('');
    try {
      const sent = await sendThreadMessage({ listingId, buyerId, body });
      setMessages((current) => [...current, sent]);
      setDraft('');
    } catch (cause) {
      console.error('message send failed', cause);
      setSendError('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#172018]/70 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <div className="flex h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-[#f7f5ef] text-[#222622] shadow-2xl dark:bg-[#1f2a23] dark:text-[#f7f7fa] sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-black/10 px-6 py-5 dark:border-white/10">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#8f6e44]">İlan mesajları</p>
            <h2 className="mt-1 truncate text-base font-semibold">{listingTitle}</h2>
          </div>
          <button onClick={onClose} aria-label="Kapat" className="shrink-0 rounded-full p-2 hover:bg-black/5"><X size={18} /></button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {status === 'loading' && <p className="text-sm text-[#68746b]">Mesajlar yükleniyor...</p>}
          {status === 'error' && <p className="text-sm text-[#b42345]">Mesajlar şu an alınamadı. Lütfen tekrar deneyin.</p>}
          {status === 'ready' && messages.length === 0 && <p className="text-sm text-[#68746b]">Henüz mesaj yok. İlan sahibine ilk mesajı gönderin.</p>}
          {status === 'ready' && messages.map((message) => {
            const isOwn = message.sender_id === currentUserId;
            return (
              <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${isOwn ? 'bg-[#f43f68] text-white' : 'bg-white text-[#222622] dark:bg-white/10 dark:text-[#f7f7fa]'}`}>
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p className={`mt-1 text-[10px] ${isOwn ? 'text-white/80' : 'text-[#849087] dark:text-[#aab5ac]'}`}>{formatMessageTime(message.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSend} className="border-t border-black/10 px-6 py-4 dark:border-white/10">
          {sendError && <p className="mb-2 text-xs text-[#b42345]">{sendError}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={1000}
              rows={2}
              disabled={status !== 'ready'}
              placeholder="Mesajınızı yazın..."
              className="min-w-0 flex-1 resize-none rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#222622] outline-none focus:border-[#f43f68] disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-[#f7f7fa]"
            />
            <button type="submit" disabled={sending || status !== 'ready' || !draft.trim()} className="flex items-center gap-2 rounded-xl bg-[#f43f68] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#d82e57] disabled:opacity-50">
              <Send size={14} /> Gönder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
