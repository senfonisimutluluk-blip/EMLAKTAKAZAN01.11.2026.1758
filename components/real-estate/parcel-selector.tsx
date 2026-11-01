'use client';

import { useState } from 'react';
import { LoaderCircle, MapPin, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { LocationPicker } from '@/components/real-estate/location-picker';

interface ParcelResult {
  coordinates: { lat: number; lng: number } | null;
  displayName: string;
  city: string;
  district: string;
  neighborhood: string | null;
  ada: string;
  parsel: string;
  note: string;
}

export function ParcelSelector({
  city: initialCity,
  district: initialDistrict,
  neighborhood: initialNeighborhood,
  onResult,
  onLocationChange,
  compact = false,
}: {
  city: string;
  district: string;
  neighborhood?: string;
  onResult: (result: ParcelResult) => void;
  onLocationChange?: (parts: { city: string; district: string; neighborhood: string }) => void;
  compact?: boolean;
}) {
  const [city, setCity] = useState(initialCity);
  const [district, setDistrict] = useState(initialDistrict);
  const [neighborhood, setNeighborhood] = useState(initialNeighborhood ?? '');
  const [ada, setAda] = useState('');
  const [parsel, setParsel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [found, setFound] = useState(false);

  async function search() {
    if (!city || !district || !ada || !parsel) {
      setError('İl, ilçe, ada ve parsel numarası gerekli.');
      return;
    }
    setBusy(true);
    setError('');
    setFound(false);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('parcel-lookup', {
        body: { city, district, neighborhood, ada, parsel },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      const result = data as ParcelResult;
      setFound(true);
      onResult(result);
    } catch {
      setError('Parsel sorgusu tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-2xl border border-[#3b82f6]/30 bg-[#3b82f6]/5 p-4 ${compact ? '' : 'sm:p-5'}`}>
      <div className="mb-3 flex items-center gap-2">
        <MapPin size={16} className="text-[#3b82f6]" />
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#3b82f6]">Ada / Parsel ile konum bul</p>
      </div>

      <LocationPicker
        onChange={() => {}}
        onPartsChange={(parts) => {
          setCity(parts.city);
          setDistrict(parts.district);
          setNeighborhood(parts.neighborhood);
          onLocationChange?.(parts);
        }}
      />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block text-xs font-semibold text-[#aaa9b6]">Ada
          <input
            value={ada}
            onChange={(e) => setAda(e.target.value)}
            type="number"
            min="1"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#20202c] px-3 py-2.5 text-sm text-white outline-none focus:border-[#3b82f6] dark:border-white/10 dark:bg-white/10"
            placeholder="1234"
          />
        </label>
        <label className="block text-xs font-semibold text-[#aaa9b6]">Parsel
          <input
            value={parsel}
            onChange={(e) => setParsel(e.target.value)}
            type="number"
            min="1"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#20202c] px-3 py-2.5 text-sm text-white outline-none focus:border-[#3b82f6] dark:border-white/10 dark:bg-white/10"
            placeholder="567"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => void search()}
        disabled={busy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#3b82f6] py-2.5 text-xs font-bold text-white transition hover:bg-[#2563eb] disabled:opacity-60"
      >
        {busy ? <><LoaderCircle size={15} className="animate-spin" /> Sorgulanıyor...</> : <><Search size={15} /> Parselden konumu bul</>}
      </button>
      {error && <p className="mt-2 text-xs text-[#ffb5c5]">{error}</p>}
      {found && <p className="mt-2 text-xs text-[#7ee787]">Konum bulundu ve haritaya işaretlendi.</p>}
    </div>
  );
}
