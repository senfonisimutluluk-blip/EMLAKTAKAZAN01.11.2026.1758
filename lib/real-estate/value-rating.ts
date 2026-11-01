import type { Listing } from './types';

export interface ValueRating {
  stars: number;
  label: string;
  score: number;
  color: string;
  bgColor: string;
}

const AREA_PRICE_REFERENCE: Record<string, { minPerM2: number; maxPerM2: number }> = {
  'Daire': { minPerM2: 45000, maxPerM2: 120000 },
  'Villa': { minPerM2: 70000, maxPerM2: 180000 },
  'Rezidans': { minPerM2: 80000, maxPerM2: 200000 },
  'Müstakil Ev': { minPerM2: 50000, maxPerM2: 130000 },
  'Ofis': { minPerM2: 40000, maxPerM2: 100000 },
  'Dükkan': { minPerM2: 60000, maxPerM2: 150000 },
  'Arsa': { minPerM2: 3000, maxPerM2: 15000 },
  'Günlük Kiralık': { minPerM2: 25000, maxPerM2: 80000 },
  'Bungalow': { minPerM2: 20000, maxPerM2: 60000 },
  'Tiny House': { minPerM2: 25000, maxPerM2: 70000 },
  'Butik Otel': { minPerM2: 50000, maxPerM2: 150000 },
};

const PREMIUM_CITIES = ['istanbul', 'bodrum', 'çeşme', 'foça', 'datça', 'kaş', 'belek'];
const MID_CITIES = ['ankara', 'izmir', 'bursa', 'antalya', 'konya'];

function locationFactor(city: string): number {
  const lower = city.toLocaleLowerCase('tr-TR');
  if (PREMIUM_CITIES.some((c) => lower.includes(c))) return 1.3;
  if (MID_CITIES.some((c) => lower.includes(c))) return 1.0;
  return 0.75;
}

export function computeValueRating(listing: Listing): ValueRating {
  const area = Math.max(1, listing.area);
  const pricePerM2 = listing.price / area;
  const ref = AREA_PRICE_REFERENCE[listing.type] ?? { minPerM2: 40000, maxPerM2: 120000 };
  const factor = locationFactor(listing.city);
  const adjustedLow = ref.minPerM2 * factor;
  const adjustedHigh = ref.maxPerM2 * factor;
  const midpoint = (adjustedLow + adjustedHigh) / 2;

  const ratio = pricePerM2 / midpoint;

  let stars: number;
  let label: string;

  if (ratio <= 0.55) {
    stars = 5;
    label = 'Çok uygun fiyat';
  } else if (ratio <= 0.75) {
    stars = 4;
    label = 'Uygun fiyat';
  } else if (ratio <= 0.95) {
    stars = 3;
    label = 'Değerinde (kazandırır)';
  } else if (ratio <= 1.2) {
    stars = 2;
    label = 'Gerçek değere yakın';
  } else {
    stars = 1;
    label = 'Yüksek fiyatlı';
  }

  const score = Math.max(0, Math.min(100, Math.round((1 - Math.min(ratio, 2) / 2) * 100)));

  const colorMap: Record<number, { color: string; bgColor: string }> = {
    5: { color: '#00c853', bgColor: 'rgba(0,200,83,0.12)' },
    4: { color: '#64dd17', bgColor: 'rgba(100,221,23,0.12)' },
    3: { color: '#ffab00', bgColor: 'rgba(255,171,0,0.12)' },
    2: { color: '#ff6d00', bgColor: 'rgba(255,109,0,0.12)' },
    1: { color: '#d50000', bgColor: 'rgba(213,0,0,0.12)' },
  };

  return { stars, label, score, ...colorMap[stars] };
}
