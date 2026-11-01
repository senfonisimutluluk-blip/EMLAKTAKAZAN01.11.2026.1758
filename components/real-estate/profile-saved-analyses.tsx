'use client';

import { useEffect, useState } from 'react';
import { BarChart3, ChevronDown, MapPin, Trash2, TrendingUp } from 'lucide-react';
import { fetchSavedAnalyses, deleteSavedAnalysis, type SavedAnalysis } from '@/lib/real-estate/saved-analyses';

const money = (value: number) => new Intl.NumberFormat('tr-TR').format(value);

export function ProfileSavedAnalyses({ userId }: { userId: string }) {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchSavedAnalyses(userId)
      .then((items) => { if (mounted) setAnalyses(items); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [userId]);

  async function handleDelete(id: string) {
    try {
      await deleteSavedAnalysis(id);
      setAnalyses((current) => current.filter((item) => item.id !== id));
    } catch { /* ignore */ }
  }

  if (loading) return <div className="rounded-3xl border border-white/10 bg-[#171720] p-6"><p className="text-sm text-[#aaa9b6]">Analizler yükleniyor...</p></div>;

  return (
    <div className="rounded-3xl border border-white/10 bg-[#171720] p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#ffb21a]">Yapay zeka</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Kaydedilen analizlerim</h2>
        </div>
        <BarChart3 className="text-[#f43f68]" size={22} />
      </div>

      {analyses.length === 0 ? (
        <p className="rounded-2xl bg-[#20202c] p-4 text-sm text-[#aaa9b6]">
          Henüz kaydedilmiş analiz yok. Yapay zeka sekmesinden piyasa analizi yaparak buraya kaydedebilirsiniz.
        </p>
      ) : (
        <div className="space-y-3">
          {analyses.map((item) => (
            <div key={item.id} className="rounded-2xl bg-[#20202c] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#aaa9b6]">
                    <MapPin size={12} /> {item.city} / {item.district}
                    {item.neighborhood && ` / ${item.neighborhood}`}
                    <span className="mx-1">·</span>
                    {item.listing_mode === 'kiralik' ? 'Kiralık' : 'Satılık'}
                  </p>
                </div>
                <button
                  onClick={() => void handleDelete(item.id)}
                  className="shrink-0 rounded-lg p-2 text-[#aaa9b6] transition hover:bg-[#f43f68]/15 hover:text-[#f43f68]"
                  aria-label="Analizi sil"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1 rounded-lg bg-[#f43f68]/15 px-2.5 py-1.5 font-semibold text-[#ff9ab0]">
                  <TrendingUp size={13} /> {money(item.low)} – {money(item.high)} {item.unit}
                </span>
                <span className="rounded-lg bg-black/20 px-2.5 py-1.5 text-[#c8c6d0]">{money(item.price_per_square_meter)} {item.unit}/m²</span>
                <span className="rounded-lg bg-black/20 px-2.5 py-1.5 text-[#c8c6d0]">%{item.confidence} güven</span>
                <span className="text-[10px] text-[#777687]">
                  {new Date(item.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <p className="mt-3 text-xs leading-5 text-[#c8c6d0]">{item.summary}</p>

              {item.report_json && item.report_json.length > 0 && (
                <>
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#ffb21a] transition hover:text-white"
                  >
                    <ChevronDown size={14} className={`transition ${expandedId === item.id ? 'rotate-180' : ''}`} />
                    {expandedId === item.id ? 'Raporu gizle' : 'Detaylı raporu göster'}
                  </button>
                  {expandedId === item.id && (
                    <div className="mt-3 space-y-3">
                      {item.report_json.map((section, idx) => (
                        <div key={idx} className="rounded-xl bg-black/20 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#ffb21a]">{section.title}</p>
                          <p className="mt-2 whitespace-pre-line text-[11px] leading-5 text-[#c8c6d0]">{section.body}</p>
                        </div>
                      ))}
                      {item.signals_json && item.signals_json.length > 0 && (
                        <div className="rounded-xl bg-black/20 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#ffb21a]">Kaynaklar</p>
                          <ul className="mt-2 space-y-1.5">
                            {item.signals_json.map((signal, idx) => (
                              <li key={idx} className="text-[11px] text-[#c8c6d0]">
                                <span className="font-semibold">{signal.title}</span>
                                {signal.snippet && `: ${signal.snippet}`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
