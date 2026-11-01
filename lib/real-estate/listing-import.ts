import { supabase } from '@/lib/supabase/client';

export type ImportedListingDraft = {
  title: string | null;
  description: string | null;
  price: number | null;
  area: number | null;
  rooms: string | null;
  floor: string | null;
  buildingAge: string | null;
  propertyTypeLabel: string | null;
  locationHint: string | null;
};

const textOrNull = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const numberOrNull = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null);

export async function importListingFromUrl(url: string): Promise<ImportedListingDraft> {
  const { data, error } = await supabase.functions.invoke('import-listing', { body: { url } });
  const draft = (data as { draft?: unknown } | null)?.draft;
  if (error || !draft || typeof draft !== 'object') throw new Error('İlan çekilemedi.');
  const raw = draft as Record<string, unknown>;
  return {
    title: textOrNull(raw.title),
    description: textOrNull(raw.description),
    price: numberOrNull(raw.price),
    area: numberOrNull(raw.area),
    rooms: textOrNull(raw.rooms),
    floor: textOrNull(raw.floor),
    buildingAge: textOrNull(raw.buildingAge),
    propertyTypeLabel: textOrNull(raw.propertyTypeLabel),
    locationHint: textOrNull(raw.locationHint),
  };
}
