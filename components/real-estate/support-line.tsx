'use client';

import { useState, type FormEvent } from 'react';
import { Headset, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

type Category = 'suggestion' | 'comment' | 'complaint';

const categories: Array<{ value: Category; label: string }> = [
  { value: 'suggestion', label: 'Öneri' },
  { value: 'comment', label: 'Yorum' },
  { value: 'complaint', label: 'Şikayet' },
];

const MAX_MESSAGE_LENGTH = 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SupportLine() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>('suggestion');
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [validation, setValidation] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    const email = contactEmail.trim();
    if (!trimmed) {
      setValidation('Lütfen mesajınızı yazın.');
      return;
    }
    if (email && !EMAIL_PATTERN.test(email)) {
      setValidation('Geçerli bir e-posta adresi girin.');
      return;
    }
    setValidation(null);
    setStatus('sending');
    const { error } = await supabase
      .from('support_messages')
      .insert({ category, message: trimmed, contact_email: email || null });
    if (error) {
      console.error('support message failed', error);
      setStatus('error');
      return;
    }
    setMessage('');
    setContactEmail('');
    setStatus('sent');
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-1.5 rounded-full bg-[#f43f68] px-3.5 py-2 text-[11px] font-semibold text-white shadow-xl shadow-[#f43f68]/25 transition hover:-translate-y-0.5"
      >
        <Headset size={14} /> Destek
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-sm rounded-3xl border border-white/10 bg-[#171720] p-5 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#ffb21a]">CanlınDestek Hattı</p>
              <h2 className="mt-1 text-lg font-bold text-white">Öneri, yorum veya şikayetiniz</h2>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Kapat" className="rounded-full p-2 text-[#aaa9b6] hover:bg-white/5">
              <X size={16} />
            </button>
          </div>

          {status === 'sent' ? (
            <div className="space-y-4">
              <p className="rounded-xl bg-[#4ade80]/15 px-4 py-3 text-sm text-[#4ade80]">Teşekkürler, mesajınız ekibimize ulaştı.</p>
              <button onClick={() => setStatus('idle')} className="text-xs font-semibold text-[#ffb21a] hover:underline">Yeni mesaj gönder</button>
            </div>
          ) : (
            <form onSubmit={(event) => void submit(event)} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {categories.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={category === item.value}
                    onClick={() => setCategory(item.value)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${category === item.value ? 'border-[#f43f68] bg-[#f43f68] text-white' : 'border-white/10 bg-[#20202c] text-[#aaa9b6] hover:border-[#f43f68]'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder="Mesajınızı yazın"
                  className="w-full resize-none rounded-2xl border border-white/10 bg-[#20202c] px-4 py-3 text-sm text-white outline-none placeholder:text-[#89938c] focus:border-[#f43f68]"
                />
                <p className="mt-1 text-right text-[11px] text-[#777687]">{message.length}/{MAX_MESSAGE_LENGTH}</p>
              </div>
              <input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="E-posta (isteğe bağlı)"
                className="w-full rounded-2xl border border-white/10 bg-[#20202c] px-4 py-3 text-sm text-white outline-none placeholder:text-[#89938c] focus:border-[#f43f68]"
              />
              {validation && <p className="text-xs text-[#f43f68]">{validation}</p>}
              {status === 'error' && <p className="text-xs text-[#f43f68]">Mesajınız gönderilemedi. Lütfen tekrar deneyin.</p>}
              <button
                type="submit"
                disabled={status === 'sending'}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f43f68] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d82e57] disabled:opacity-50"
              >
                {status === 'sending' && <Loader2 size={16} className="animate-spin" />}
                Gönder
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
