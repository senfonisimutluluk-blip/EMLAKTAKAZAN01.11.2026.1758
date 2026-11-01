import type { ImportedListingDraft } from '@/lib/real-estate/listing-import';

type FieldKey = 'area' | 'rooms' | 'floor' | 'buildingAge' | 'propertyTypeLabel' | 'price' | 'locationHint';

const labelMatchers: Record<FieldKey, RegExp> = {
  area: /^m²(\s*\((brüt|net)\))?$|^metrekare$/i,
  rooms: /^oda sayısı$/i,
  floor: /^bulunduğu kat$/i,
  buildingAge: /^bina yaşı$/i,
  propertyTypeLabel: /^emlak tipi$/i,
  price: /^fiyat$/i,
  locationHint: /^konum$/i,
};

const descriptionHeading = /^açıklama$/i;
const descriptionStop = /^(benzer ilanlar|harita|ilan sahibi|ilan no|kredi|ilan tarihi)/i;
const MAX_DESCRIPTION_LENGTH = 2000;

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, '');
  const number = Number(digits);
  return digits && number > 0 ? number : null;
}

function normalizeBuildingAge(value: string | undefined): string | null {
  if (!value) return null;
  if (/yeni/i.test(value) || value.trim() === '0') return '0 (Yeni)';
  return value.trim();
}

function readDescription(lines: string[]): string | null {
  const start = lines.findIndex((line) => descriptionHeading.test(line));
  if (start === -1) return null;
  const collected: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (descriptionStop.test(line) || Object.values(labelMatchers).some((matcher) => matcher.test(line))) break;
    collected.push(line);
  }
  const text = collected.join(' ').slice(0, MAX_DESCRIPTION_LENGTH).trim();
  return text || null;
}

export function parseListingText(text: string): ImportedListingDraft {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const found: Partial<Record<FieldKey, string>> = {};

  lines.forEach((line, index) => {
    const next = lines[index + 1];
    if (!next) return;
    (Object.keys(labelMatchers) as FieldKey[]).forEach((key) => {
      if (found[key] === undefined && labelMatchers[key].test(line) && !Object.values(labelMatchers).some((matcher) => matcher.test(next))) {
        found[key] = next;
      }
    });
  });

  return {
    title: null,
    description: readDescription(lines),
    price: toNumber(found.price),
    area: toNumber(found.area),
    rooms: found.rooms ?? null,
    floor: found.floor ?? null,
    buildingAge: normalizeBuildingAge(found.buildingAge),
    propertyTypeLabel: found.propertyTypeLabel ?? null,
    locationHint: found.locationHint ?? null,
  };
}
