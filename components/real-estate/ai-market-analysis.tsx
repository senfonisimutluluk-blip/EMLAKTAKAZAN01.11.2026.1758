'use client';

import { useState } from 'react';
import { Bot, ChevronDown, LoaderCircle, Save, Sparkles, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { saveAnalysis } from '@/lib/real-estate/saved-analyses';
import { LocationPicker } from '@/components/real-estate/location-picker';
import { ListingFeatureFields } from '@/components/real-estate/listing-feature-fields';
import { ParcelSelector } from '@/components/real-estate/parcel-selector';
import { arsaPropertyTypes, commercialPropertyTypes, GENERAL_COMMERCIAL_TYPE, konutPropertyTypes, type PropertyType } from '@/lib/real-estate/property-types';
import { selectedFeatureTags, specifiedFeatureDetails } from '@/lib/real-estate/property-features';

type ListingMode = 'satilik' | 'kiralik';
type ReportSection = { title: string; body: string };
type MarketResult = {
  listingMode: ListingMode;
  summary: string;
  low: number;
  high: number;
  unit: string;
  pricePerSquareMeter: number;
  sourceCount: number;
  confidence: number;
  signals: Array<{ title: string; snippet: string; url: string }>;
  report: ReportSection[];
};

const money = (value: number) => new Intl.NumberFormat('tr-TR').format(value);

function isMarketResult(data: unknown): data is MarketResult {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as Partial<MarketResult>;
  return typeof candidate.summary === 'string' && typeof candidate.low === 'number' && typeof candidate.high === 'number' && Array.isArray(candidate.report) && Array.isArray(candidate.signals);
}

export function AiMarketAnalysis() {
  const [form, setForm] = useState({ city: 'İzmir', district: '', neighborhood: '', propertyType: 'Daire' as PropertyType, area: '' });
  const [featureValues, setFeatureValues] = useState<Record<string, string>>({});
  const [showFeatures, setShowFeatures] = useState(false);
  const [listingMode, setListingMode] = useState<ListingMode | null>(null);
  const [result, setResult] = useState<MarketResult | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const updateFeature = (key: string, value: string) => setFeatureValues((current) => ({ ...current, [key]: value }));

  async function analyze() {
    if (!listingMode) { setError('Önce satılık mı kiralık mı olduğunu seçin.'); return; }
    if (!form.city || !form.district || !form.propertyType || !form.area) { setError('İl, ilçe, emlak tipi ve m² alanlarını doldurun.'); return; }
    setBusy(true);
    setError('');
    setResult(null);
    setShowReport(false);
    const { data, error: invokeError } = await supabase.functions.invoke('property-market-analysis', {
      body: {
        city: form.city, district: form.district, neighborhood: form.neighborhood, propertyType: form.propertyType,
        area: Number(form.area), listingMode,
        features: selectedFeatureTags(form.propertyType, featureValues),
        details: specifiedFeatureDetails(form.propertyType, featureValues),
      },
    });
    if (invokeError || !isMarketResult(data)) setError('Analiz şu anda tamamlanamadı. Lütfen bilgileri kontrol edip tekrar deneyin.');
    else setResult(data);
    setSavedMsg('');
    setBusy(false);
  }

  async function handleSaveAnalysis() {
    if (!result) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavedMsg('Analizi kaydetmek için giriş yapmalısınız.'); return; }
    try {
      await saveAnalysis(user.id, {
        title: `${form.city} / ${form.district} — ${form.propertyType} ${form.area} m²`,
        city: form.city,
        district: form.district,
        neighborhood: form.neighborhood,
        propertyType: form.propertyType,
        area: Number(form.area),
        listingMode: listingMode ?? 'satilik',
        low: result.low,
        high: result.high,
        pricePerSquareMeter: result.pricePerSquareMeter,
        unit: result.unit,
        confidence: result.confidence,
        summary: result.summary,
        report: result.report,
        signals: result.signals,
      });
      setSavedMsg('Analiz profilinize kaydedildi.');
    } catch {
      setSavedMsg('Analiz kaydedilemedi. Tekrar deneyin.');
    }
  }

  const modeButton = (mode: ListingMode, label: string) => (
    <button type="button" onClick={() => setListingMode(mode)}
      className={`flex-1 rounded-2xl border py-3.5 text-sm font-bold transition ${listingMode === mode ? 'border-[#f43f68] bg-[#f43f68] text-white' : 'border-white/10 bg-[#20202c] text-[#c8c6d0] hover:border-white/25'}`}>
      {label}
    </button>
  );

  return (
    <section className="relative my-16 overflow-hidden rounded-[2rem] border border-white/10 bg-[#171720] p-6 shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:p-10">
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#f43f68]/15 blur-3xl" />
      <div className="relative grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
        <div>
          <div className="mb-5 flex items-center gap-3 text-[#f43f68]">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f43f68]/15"><Bot size={24} /></span>
            <span className="text-xs font-bold uppercase tracking-[.18em]">İnternet destekli analiz</span>
          </div>
          <h2 className="max-w-lg text-4xl font-bold leading-tight text-white sm:text-5xl">Yapay zekâ ile emlak değerini keşfet.</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#a8a7b5]">Konumu, emlak tipini ve özellikleri girin, satılık ya da kiralık seçin. Web kaynaklarındaki örnek ilanlardan bir özet ve ayrıntılı rapor hazırlanır.</p>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#777687]"><Sparkles size={14} className="text-[#ffb21a]" /> Sonuçlar yatırım kararı öncesi ön değerlendirmedir.</div>
        </div>

        <div className="relative rounded-3xl border border-white/10 bg-[#0d0d13] p-5 sm:p-6">
          <LocationPicker onChange={() => undefined} onPartsChange={(parts) => setForm((current) => ({ ...current, ...parts }))} />

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-[#aaa9b6]">m²
              <input value={form.area} onChange={(event) => update('area', event.target.value)} type="number" min="1" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#20202c] px-4 py-3 text-sm text-white outline-none focus:border-[#f43f68]" placeholder="120" />
            </label>
            <label className="block text-xs font-semibold text-[#aaa9b6]">Emlak tipi
              <select value={form.propertyType} onChange={(event) => update('propertyType', event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#20202c] px-4 py-3 text-sm text-white outline-none focus:border-[#f43f68]">
                <optgroup label="Konut ve arsa">{[...konutPropertyTypes, ...arsaPropertyTypes].map((type) => <option key={type}>{type}</option>)}</optgroup>
                <optgroup label="Ticari gayrimenkul">{[GENERAL_COMMERCIAL_TYPE, ...commercialPropertyTypes].map((type) => <option key={type}>{type}</option>)}</optgroup>
              </select>
            </label>
          </div>

          <ParcelSelector
            city={form.city}
            district={form.district}
            neighborhood={form.neighborhood}
            onResult={(result) => {
              if (result.coordinates) {
                setForm((current) => ({ ...current, city: result.city, district: result.district, neighborhood: result.neighborhood ?? current.neighborhood }));
              }
            }}
            onLocationChange={(parts) => {
              setForm((current) => ({ ...current, city: parts.city, district: parts.district, neighborhood: parts.neighborhood }));
            }}
          />

          <button type="button" onClick={() => setShowFeatures(!showFeatures)} className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#20202c] px-4 py-3 text-left text-sm font-semibold text-[#c8c6d0] transition hover:border-white/25">
            Özellikleri ekle <span className="text-xs font-normal text-[#777687]">isteğe bağlı</span>
            <ChevronDown size={16} className={`transition ${showFeatures ? 'rotate-180' : ''}`} />
          </button>
          {showFeatures && (
            <div className="mt-3">
              <ListingFeatureFields type={form.propertyType} values={featureValues} onChange={updateFeature} />
            </div>
          )}

          <p className="mt-5 text-xs font-semibold text-[#aaa9b6]">Satılık mı, kiralık mı?</p>
          <div className="mt-2 flex gap-3">
            {modeButton('satilik', 'Satılık')}
            {modeButton('kiralik', 'Kiralık')}
          </div>

          <button onClick={() => void analyze()} disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f43f68] py-4 text-sm font-bold text-white transition hover:bg-[#d82e57] disabled:opacity-60">
            {busy ? <><LoaderCircle size={18} className="animate-spin" /> Web verileri taranıyor...</> : <><TrendingUp size={18} /> Analizi başlat</>}
          </button>

          {error && <p className="mt-3 rounded-xl bg-[#4b202d] px-4 py-3 text-xs text-[#ffb5c5]">{error}</p>}

          {savedMsg && <p className="mt-2 text-xs text-[#7ee787]">{savedMsg}</p>}

          {result && (
            <div className="mt-5 rounded-2xl border border-[#f43f68]/30 bg-[#f43f68]/10 p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#ff9ab0]">{result.listingMode === 'kiralik' ? 'Tahmini aylık kira' : 'Tahmini piyasa aralığı'}</p>
                  <p className="mt-1 text-2xl font-bold text-white">{money(result.low)} – {money(result.high)} {result.unit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => void handleSaveAnalysis()} className="flex items-center gap-1.5 rounded-full border border-[#ffb21a]/40 bg-[#ffb21a]/10 px-3 py-1.5 text-xs font-semibold text-[#ffb21a] transition hover:bg-[#ffb21a]/20"><Save size={13} /> Analizi kaydet</button>
                  <span className="rounded-full bg-[#f43f68] px-3 py-1.5 text-xs font-bold text-white">%{result.confidence} güven</span>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#dedce5]">{result.summary}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[#c8c6d0]">
                <span className="rounded-xl bg-black/20 p-3"><b className="block text-base text-white">{money(result.pricePerSquareMeter)} {result.unit}</b>m² başına</span>
                <span className="rounded-xl bg-black/20 p-3"><b className="block text-base text-white">{result.sourceCount}</b>web kaynağı</span>
              </div>

              <button type="button" onClick={() => setShowReport(!showReport)} className="mt-4 flex w-full items-center justify-between rounded-xl bg-black/20 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-black/30">
                {showReport ? 'Detaylı raporu gizle' : 'Detaylı raporu göster'}
                <ChevronDown size={16} className={`transition ${showReport ? 'rotate-180' : ''}`} />
              </button>

              {showReport && (
                <div className="mt-3 space-y-4">
                  {result.report.map((section) => (
                    <div key={section.title} className="rounded-xl bg-black/20 p-4">
                      <p className="text-xs font-bold uppercase tracking-[.12em] text-[#ffb21a]">{section.title}</p>
                      <p className="mt-2 whitespace-pre-line text-xs leading-6 text-[#c8c6d0]">{section.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
