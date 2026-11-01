'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { LogIn, Loader2, Search, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getProvinces } from '@/lib/locations/turkiye';

type Room = { key: string; label: string };
type ChatMessage = { id: string; author_name: string; content: string; created_at: string; user_id: string };

const MESSAGE_COLUMNS = 'id, author_name, content, created_at, user_id';
const MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LENGTH = 500;
const fixedRooms: Room[] = [
  { key: 'genel', label: 'Genel Sohbet' },
  { key: 'turkiye', label: 'Tüm Türkiye' },
];

export function ChatRooms({ authorName, currentUserId, onRequireAuth }: {
  authorName: string;
  currentUserId: string | null;
  onRequireAuth: () => void;
}) {
  const [provinceRooms, setProvinceRooms] = useState<Room[]>([]);
  const [provincesFailed, setProvincesFailed] = useState(false);
  const [roomKey, setRoomKey] = useState('genel');
  const [roomSearch, setRoomSearch] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const rooms = useMemo(() => [...fixedRooms, ...provinceRooms], [provinceRooms]);
  const query = roomSearch.trim().toLocaleLowerCase('tr-TR');
  const visibleRooms = rooms.filter((room) => room.label.toLocaleLowerCase('tr-TR').includes(query));
  const activeRoom = rooms.find((room) => room.key === roomKey) ?? fixedRooms[0];

  useEffect(() => {
    let mounted = true;
    getProvinces()
      .then((items) => {
        if (!mounted) return;
        setProvinceRooms(items
          .map((province) => ({ key: `il-${province.id}`, label: province.name }))
          .sort((a, b) => a.label.localeCompare(b.label, 'tr')));
      })
      .catch(() => { if (mounted) setProvincesFailed(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    let mounted = true;
    setMessages([]);
    setLoading(true);
    setLoadFailed(false);
    supabase
      .from('chat_messages')
      .select(MESSAGE_COLUMNS)
      .eq('room_key', roomKey)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_LIMIT)
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          console.error('chat load failed', error);
          setLoadFailed(true);
        } else {
          setMessages(((data ?? []) as ChatMessage[]).reverse());
        }
        setLoading(false);
      });
    const channel = supabase
      .channel(`chat-room-${roomKey}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_key=eq.${roomKey}` }, (payload) => {
        const row = payload.new as ChatMessage;
        setMessages((current) => current.some((message) => message.id === row.id) ? current : [...current, row]);
      })
      .subscribe();
    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [roomKey, currentUserId]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setSendFailed(false);
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ room_key: roomKey, author_name: authorName.slice(0, 40), content: content.slice(0, MAX_MESSAGE_LENGTH) })
      .select(MESSAGE_COLUMNS)
      .single();
    setSending(false);
    if (error || !data) {
      console.error('chat send failed', error);
      setSendFailed(true);
      return;
    }
    const row = data as ChatMessage;
    setMessages((current) => current.some((message) => message.id === row.id) ? current : [...current, row]);
    setDraft('');
  };

  return (
    <section className="mx-auto max-w-5xl py-10">
      <div className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-[#ffb21a]">Topluluk</p>
        <h1 className="text-4xl font-bold text-white sm:text-5xl">Sohbet odaları</h1>
        <p className="mt-3 text-sm text-[#aaa9b6]">Genel sohbete, tüm Türkiye odasına veya bulunduğunuz ilin odasına katılın.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl border border-white/10 bg-[#171720] p-4">
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#20202c] px-3 py-2.5">
            <Search size={16} className="text-[#ffb21a]" />
            <input
              value={roomSearch}
              onChange={(event) => setRoomSearch(event.target.value)}
              placeholder="İl ara"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#89938c]"
            />
          </div>
          <div className="flex max-h-[520px] flex-col gap-1 overflow-y-auto">
            {visibleRooms.map((room) => (
              <button
                key={room.key}
                onClick={() => setRoomKey(room.key)}
                aria-current={room.key === activeRoom.key ? 'true' : undefined}
                className={`rounded-xl px-3 py-2.5 text-left text-sm transition ${room.key === activeRoom.key ? 'bg-[#f43f68] font-semibold text-white' : 'text-[#aaa9b6] hover:bg-white/5 hover:text-white'}`}
              >
                {room.label}
              </button>
            ))}
            {visibleRooms.length === 0 && <p className="px-3 py-2 text-xs text-[#777687]">Eşleşen oda yok.</p>}
          </div>
          {provincesFailed && <p className="mt-3 text-xs text-[#f43f68]">İl odaları şu anda yüklenemedi. Genel odalar kullanılabilir.</p>}
        </aside>

        <div className="flex min-h-[560px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#171720]">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-bold text-white">{activeRoom.label}</h2>
          </div>

          {currentUserId ? (
            <>
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
                {loading && <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#aaa9b6]"><Loader2 size={16} className="animate-spin" /> Mesajlar yükleniyor...</div>}
                {loadFailed && <p className="rounded-xl bg-[#f43f68]/15 px-4 py-3 text-sm text-[#f43f68]">Mesajlar yüklenemedi. Lütfen sayfayı yenileyin.</p>}
                {!loading && !loadFailed && messages.length === 0 && <p className="py-10 text-center text-sm text-[#777687]">Bu odada henüz mesaj yok. İlk mesajı siz yazın.</p>}
                {messages.map((message) => {
                  const own = message.user_id === currentUserId;
                  return (
                    <div key={message.id} className={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
                      <span className="mb-1 text-[11px] text-[#777687]">
                        {own ? 'Siz' : message.author_name} · {new Date(message.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-6 ${own ? 'bg-[#f43f68] text-white' : 'bg-[#20202c] text-[#f7f7fa]'}`}>
                        {message.content}
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={(event) => void send(event)} className="flex items-center gap-2 border-t border-white/10 p-4">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder={`${activeRoom.label} odasına yazın`}
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#20202c] px-4 py-3 text-sm text-white outline-none placeholder:text-[#89938c] focus:border-[#f43f68]"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  aria-label="Gönder"
                  className="shrink-0 rounded-2xl bg-[#f43f68] p-3 text-white transition hover:bg-[#d82e57] disabled:opacity-40"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </form>
              {sendFailed && <p className="px-5 pb-4 text-xs text-[#f43f68]">Mesajınız gönderilemedi. Lütfen tekrar deneyin.</p>}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
              <p className="text-sm text-[#aaa9b6]">Sohbet odalarına katılmak için giriş yapın.</p>
              <button onClick={onRequireAuth} className="flex items-center gap-2 rounded-full bg-[#f43f68] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#d82e57]">
                <LogIn size={15} /> Giriş yap
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
