'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { getDistricts, getNeighborhoods, getProvinces, type TurkeyLocation } from '@/lib/locations/turkiye';

type LocationParts = { city: string; district: string; neighborhood: string };

export function LocationPicker({ onChange, onPartsChange }: { onChange: (value: string) => void; onPartsChange?: (parts: LocationParts) => void }) {
  const [provinces, setProvinces] = useState<TurkeyLocation[]>([]);
  const [districts, setDistricts] = useState<TurkeyLocation[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<TurkeyLocation[]>([]);
  const [province, setProvince] = useState<TurkeyLocation | null>(null);
  const [district, setDistrict] = useState<TurkeyLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => { getProvinces().then(setProvinces).catch(() => setError(true)); }, []);
  async function chooseProvince(value: string) {
    const selected = provinces.find((item) => String(item.id) === value) ?? null;
    setProvince(selected); setDistrict(null); setNeighborhoods([]); onChange(selected?.name ?? ''); onPartsChange?.({ city: selected?.name ?? '', district: '', neighborhood: '' });
    if (!selected) return;
    setLoading(true); setError(false);
    try { setDistricts(await getDistricts(selected.id)); } catch { setError(true); } finally { setLoading(false); }
  }
  async function chooseDistrict(value: string) {
    const selected = districts.find((item) => String(item.id) === value) ?? null;
    setDistrict(selected); setNeighborhoods([]); onChange([province?.name, selected?.name].filter(Boolean).join(' / ')); onPartsChange?.({ city: province?.name ?? '', district: selected?.name ?? '', neighborhood: '' });
    if (!selected) return;
    setLoading(true); setError(false);
    try { setNeighborhoods(await getNeighborhoods(selected.id)); } catch { setError(true); } finally { setLoading(false); }
  }
  function chooseNeighborhood(value: string) { const selected = neighborhoods.find((item) => String(item.id) === value); onChange([province?.name, district?.name, selected?.name].filter(Boolean).join(' / ')); onPartsChange?.({ city: province?.name ?? '', district: district?.name ?? '', neighborhood: selected?.name ?? '' }); }

  return <div className="rounded-2xl border border-[#dfe6dc] bg-[#f0f5ef] p-3 dark:bg-white/5"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#526257]"><MapPin size={14} /> Türkiye adresi</div><div className="grid gap-2 sm:grid-cols-3"><select value={province?.id ?? ''} onChange={(event) => void chooseProvince(event.target.value)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs outline-none dark:border-white/10 dark:bg-white/10"><option value="">İl seçin</option>{provinces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={district?.id ?? ''} onChange={(event) => void chooseDistrict(event.target.value)} disabled={!province || loading} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs outline-none disabled:opacity-50 dark:border-white/10 dark:bg-white/10"><option value="">İlçe seçin</option>{districts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select onChange={(event) => chooseNeighborhood(event.target.value)} disabled={!district || loading} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs outline-none disabled:opacity-50 dark:border-white/10 dark:bg-white/10"><option value="">Mahalle seçin</option>{neighborhoods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>{error && <p className="mt-2 text-[11px] text-[#9b5c4c]">Adres servisine şu an ulaşılamıyor; kelimeyle arama devam eder.</p>}</div>;
}
