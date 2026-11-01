'use client';

import { useEffect, useState } from 'react';
import { Bell, Heart, X } from 'lucide-react';
import { fetchNotifications, markMessagesRead, type NotificationsData } from '@/lib/real-estate/messaging';
import { deleteListingComment } from '@/lib/real-estate/comments';
import { formatMessageTime, type ThreadTarget } from '@/components/real-estate/listing-thread';

interface NotificationsPanelProps {
  userId: string;
  onOpenThread: (target: ThreadTarget) => void;
  onClose: () => void;
}

export function NotificationsPanel({ userId, onOpenThread, onClose }: NotificationsPanelProps) {
  const [data, setData] = useState<NotificationsData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let active = true;
    fetchNotifications(userId)
      .then((result) => {
        if (!active) return;
        setData(result);
        setStatus('ready');
        return markMessagesRead(userId).catch((cause) => console.error('marking messages read failed', cause));
      })
      .catch((cause) => {
        console.error('notifications load failed', cause);
        if (active) setStatus('error');
      });
    return () => { active = false; };
  }, [userId]);

  async function removeComment(commentId: string) {
    setActionError('');
    try {
      await deleteListingComment(commentId);
      setData((current) => current && { ...current, comments: current.comments.filter((item) => item.id !== commentId) });
    } catch (cause) {
      console.error('comment delete failed', cause);
      setActionError('Yorum silinemedi. Lütfen tekrar deneyin.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#172018]/50 backdrop-blur-sm" onClick={onClose}>
      <aside onClick={(event) => event.stopPropagation()} className="flex h-full w-full max-w-md flex-col bg-[#f7f5ef] text-[#222622] shadow-2xl dark:bg-[#1f2a23] dark:text-[#f7f7fa]">
        <header className="flex items-center justify-between border-b border-black/10 px-6 py-5 dark:border-white/10">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Bell size={18} /> Bildirimler</h2>
          <button onClick={onClose} aria-label="Kapat" className="rounded-full p-2 hover:bg-black/5"><X size={18} /></button>
        </header>

        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
          {status === 'loading' && <p className="text-sm text-[#68746b]">Bildirimler yükleniyor...</p>}
          {status === 'error' && <p className="text-sm text-[#b42345]">Bildirimler şu an alınamadı. Lütfen tekrar deneyin.</p>}
          {status === 'ready' && data && (
            <>
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-[#8f6e44]">Mesajlar</h3>
                {data.messages.length === 0 && <p className="text-sm text-[#68746b]">Henüz mesajınız yok.</p>}
                <ul className="space-y-3">
                  {data.messages.map((message) => (
                    <li key={message.id}>
                      <button
                        onClick={() => onOpenThread({ listingId: message.listingId, listingTitle: message.listingTitle, buyerId: message.buyerId })}
                        className="w-full rounded-2xl bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-white/10"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-[#8f6e44]">{message.listingTitle}</span>
                          {!message.isRead && <span className="shrink-0 rounded-full bg-[#f43f68] px-2 py-0.5 text-[10px] font-bold text-white">Yeni</span>}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm">{message.body}</p>
                        <p className="mt-2 text-[11px] text-[#68746b] dark:text-[#aab5ac]">{formatMessageTime(message.createdAt)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-[#8f6e44]">Yorumlar</h3>
                {actionError && <p className="mb-3 text-sm text-[#b42345]">{actionError}</p>}
                {data.comments.length === 0 && <p className="text-sm text-[#68746b]">İlanlarınıza yapılan yorum yok.</p>}
                <ul className="space-y-3">
                  {data.comments.map((comment) => (
                    <li key={comment.id} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-white/10">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-[#8f6e44]">{comment.listingTitle}</span>
                        <span className="shrink-0 text-[11px] text-[#68746b] dark:text-[#aab5ac]">{formatMessageTime(comment.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm"><span className="font-semibold">{comment.authorName}:</span> {comment.body}</p>
                      <button onClick={() => void removeComment(comment.id)} className="mt-3 text-xs font-semibold text-[#b42345] hover:underline">Yorumu sil</button>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-[#8f6e44]">Beğeniler</h3>
                {data.likes.length === 0 && <p className="text-sm text-[#68746b]">İlanlarınız henüz beğenilmedi.</p>}
                <ul className="space-y-3">
                  {data.likes.map((like) => (
                    <li key={like.id} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-white/10">
                      <Heart size={16} className="mt-0.5 shrink-0 text-[#f43f68]" fill="currentColor" />
                      <div className="min-w-0">
                        <p className="text-sm">Bir kullanıcı <span className="font-semibold">{like.listingTitle}</span> ilanınızı beğendi.</p>
                        <p className="mt-1 text-[11px] text-[#68746b] dark:text-[#aab5ac]">{formatMessageTime(like.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
