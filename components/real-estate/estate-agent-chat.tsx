'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { Mic, MicOff, Send } from 'lucide-react';
import { listings } from '@/lib/real-estate/listings';
import { advanceAgent, INITIAL_AGENT_STATE, SLOT_QUESTIONS, type AgentState } from '@/lib/real-estate/agent';
import { formatPrice } from '@/lib/real-estate/format-price';
import type { Listing } from '@/lib/real-estate/types';

type ChatEntry = { id: number; from: 'agent' | 'user'; text: string; results: Listing[] };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

const GREETING = `Merhaba, ben Emlak Ajanı. Aradığınızı birkaç soruyla öğrenip portföyümüzden en uygun ilanları önereyim. Yazarak ya da mikrofona konuşarak yanıtlayabilirsiniz.\n\n${SLOT_QUESTIONS.deal}`;

export function EstateAgentChat({ onOpenListing }: { onOpenListing: (listing: Listing) => void }) {
  const [entries, setEntries] = useState<ChatEntry[]>([{ id: 0, from: 'agent', text: GREETING, results: [] }]);
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const agentRef = useRef<AgentState>(INITIAL_AGENT_STATE);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const nextIdRef = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVoiceSupported(getSpeechRecognitionConstructor() !== null);
    return () => recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [entries]);

  const submit = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const { state, reply } = advanceAgent(agentRef.current, text, listings);
    agentRef.current = state;
    const userEntry: ChatEntry = { id: nextIdRef.current++, from: 'user', text, results: [] };
    const agentEntry: ChatEntry = { id: nextIdRef.current++, from: 'agent', text: reply.text, results: reply.results };
    setEntries((current) => [...current, userEntry, agentEntry]);
    setDraft('');
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = 'tr-TR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      setVoiceNote(null);
      submit(event.results[0]?.[0]?.transcript ?? '');
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setVoiceNote('Sesinizi algılayamadım. Yazarak devam edebilirsiniz.');
    };
    recognitionRef.current = recognition;
    setVoiceNote(null);
    setListening(true);
    recognition.start();
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#171720]">
      <div ref={listRef} className="flex min-h-[360px] max-h-[560px] flex-col gap-4 overflow-y-auto p-5 sm:p-6">
        {entries.map((entry) => (
          <div key={entry.id} className={`flex flex-col gap-3 ${entry.from === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${entry.from === 'user' ? 'bg-[#f43f68] text-white' : 'bg-[#20202c] text-[#f7f7fa]'}`}>
              {entry.text}
            </div>
            {entry.results.length > 0 && (
              <div className="grid w-full gap-3 sm:grid-cols-2">
                {entry.results.map((listing) => (
                  <button
                    key={listing.id}
                    onClick={() => onOpenListing(listing)}
                    className="flex gap-3 rounded-2xl border border-white/10 bg-[#20202c] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#f43f68]"
                  >
                    <Image src={listing.image} alt={listing.title} width={96} height={80} className="h-20 w-24 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#ffb21a]">{listing.type} · {listing.district}</p>
                      <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-white">{listing.title}</h3>
                      <p className="mt-1 text-sm font-bold text-[#f43f68]">{formatPrice(listing.price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <form
        onSubmit={(event: FormEvent) => { event.preventDefault(); submit(draft); }}
        className="flex items-center gap-2 border-t border-white/10 p-4"
      >
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleListening}
            aria-label={listening ? 'Dinlemeyi durdur' : 'Sesli komut ver'}
            className={`shrink-0 rounded-2xl border p-3 transition ${listening ? 'border-[#f43f68] bg-[#f43f68] text-white' : 'border-white/10 bg-[#20202c] text-[#ffb21a] hover:border-[#f43f68]'}`}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Örn: İstanbul'da 3+1 satılık daire, 10 milyona kadar"
          maxLength={300}
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#20202c] px-4 py-3 text-sm text-white outline-none placeholder:text-[#89938c] focus:border-[#f43f68]"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Gönder"
          className="shrink-0 rounded-2xl bg-[#f43f68] p-3 text-white transition hover:bg-[#d82e57] disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </form>
      {voiceNote && <p className="px-5 pb-4 text-xs text-[#aaa9b6]">{voiceNote}</p>}
    </div>
  );
}
