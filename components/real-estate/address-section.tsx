'use client';

import { useState } from 'react';
import { LoaderCircle, MapPin, Search } from 'lucide-react';
import { LocationPicker } from '@/components/real-estate/location-picker';
import { supabase } from '@/lib/supabase/client';

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

type LocationParts = { city: string; district: string; neighborhood: string };

export function AddressSection({
  initialCity,
  initialDistrict,
  initialNeighborhood,
  onLocationChange,
  onCoordinatesFound,
  title = 'Adres ve konum',
  variant = 'light',
}: {
  initialCity?: string;
  initialDistrict?: string;
  initialNeighborhood?: string;
  onLocationChange: (parts: LocationParts) => void;
  onCoordinatesFound?: (lat: number, lng: number) => void;
  title?: string;
  variant?: 'light' | 'dark';
}) {
  const [ada, setAda] = useState('');
  const [parsel, setParsel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [found, setFound] = useState(false);
  const [parts, setParts] = useState<LocationParts>({
    city: initialCity ?? '',
    district: initialDistrict ?? '',
    neighborhood: initialNeighborhood ?? '',
  });

  const dark = variant === 'dark';
  const cardClass = dark
    ? 'rounded-2xl border border-white/10 bg-white/5 p-4'
    : 'rounded-2xl border border-black/10 bg-[#f0f5ef] p-4';
  const labelClass = dark ? 'text-[#aaa9b6]' : 'text-[#6a746c]';
  const headerClass = dark ? 'text-[#c8c6d0]' : 'text-[#526257]';
  const inputClass = dark
    ? 'mt-1 w-full rounded-xl border border-white/10 bg-[#20202c] px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]'
    : 'mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#3b82f6]';
  const dividerClass = dark ? 'border-white/10' : 'border-black/5';
  const successClass = dark ? 'text-[#7ee787]' : 'text-[#2f7d5b]';
  const errorClass = dark ? 'text-[#ffb5c5]' : 'text-[#b42345]';

  function handleLocation(newParts: LocationParts) {
    setParts(newParts);
    onLocationChange(newParts);
  }

  async function searchParcel() {
    if (!parts.city || !parts.district || !ada || !parsel) {
      setError('İl, ilçe, ada ve parsel numarası gerekli.');
      return;
    }
    setBusy(true);
    setError('');
    setFound(false);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('parcel-lookup', {
        body: { city: parts.city, district: parts.district, neighborhood: parts.neighborhood || undefined, ada, parsel },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      const result = data as ParcelResult;
      if (result.coordinates) {
        setFound(true);
        onCoordinatesFound?.(result.coordinates.lat, result.coordinates.lng);
      } else {
        setError('Bu ada/parsel için konum bulunamadı. İl ve ilçe bilgisini kontrol edin.');
      }
    } catch {
      setError('Parsel sorgusu tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cardClass}>
      <div className={`mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] ${headerClass}`}>
        <MapPin size={14} /> {title}
      </div>

      <LocationPicker onChange={() => {}} onPartsChange={handleLocation} />

      <div className={`mt-3 border-t ${dividerClass} pt-3`}>
        <p className={`mb-2 text-[11px] font-semibold ${labelClass}`}>Ada / Parsel ile konumu otomatik işaretle</p>
        <div className="grid grid-cols-2 gap-2">
          <label className={`block text-[11px] font-semibold ${labelClass}`}>Ada
            <input
              value={ada}
              onChange={(e) => setAda(e.target.value)}
              type="number"
              min="1"
              className={inputClass}
              placeholder="1234"
            />
          </label>
          <label className={`block text-[11px] font-semibold ${labelClass}`}>Parsel
            <input
              value={parsel}
              onChange={(e) => setParsel(e.target.value)}
              type="number"
              min="1"
              className={inputClass}
              placeholder="567"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void searchParcel()}
          disabled={busy}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#3b82f6] py-2 text-xs font-bold text-white transition hover:bg-[#2563eb] disabled:opacity-60"
        >
          {busy ? <><LoaderCircle size={14} className="animate-spin" /> Sorgulanıyor...</> : <><Search size={14} /> Parselden konumu bul</>}
        </button>
        {error && <p className={`mt-2 text-[11px] ${errorClass}`}>{error}</p>}
        {found && <p className={`mt-2 text-[11px] ${successClass}`}>Konum bulundu ve haritaya işaretlendi.</p>}
      </div>
    </div>
  );
}
