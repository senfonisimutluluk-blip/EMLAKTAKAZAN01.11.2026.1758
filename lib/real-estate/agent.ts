import { allPropertyTypeOptions, commercialPropertyTypes, GENERAL_COMMERCIAL_TYPE, type PropertyType } from './property-types';
import type { Listing } from './types';

type DealType = 'sale' | 'rent';
type AgentSlot = 'deal' | 'city' | 'type' | 'maxPrice' | 'rooms';

interface SearchCriteria {
  deal?: DealType;
  city?: string;
  district?: string;
  type?: PropertyType;
  maxPrice?: number;
  rooms?: string;
}

export interface AgentState {
  criteria: SearchCriteria;
  skipped: AgentSlot[];
}

export interface AgentReply {
  text: string;
  results: Listing[];
}

export const INITIAL_AGENT_STATE: AgentState = { criteria: {}, skipped: [] };

export const SLOT_QUESTIONS: Record<AgentSlot, string> = {
  deal: 'Satılık mı kiralık mı bir gayrimenkul arıyorsunuz?',
  city: 'Hangi il veya ilçede arıyorsunuz?',
  type: 'Hangi emlak tipini istiyorsunuz? (Daire, Villa, Arsa, Ofis...)',
  maxPrice: 'Bütçeniz en fazla ne kadar? (örneğin 5 milyon)',
  rooms: 'Oda sayısı tercihiniz var mı? (örneğin 3+1)',
};

const SLOT_ORDER: AgentSlot[] = ['deal', 'city', 'type', 'maxPrice', 'rooms'];
const MAX_RESULTS = 3;
const RESET_PATTERN = /yeni arama|basa don|bastan|sifirla/;
const SKIP_PATTERN = /fark etmez|onemli degil|onemi yok|atla|gec\b/;
const SHOW_PATTERN = /sonuc|goster|listele/;

const fold = (text: string) => text
  .toLocaleLowerCase('tr-TR')
  .replace(/ı/g, 'i')
  .replace(/ş/g, 's')
  .replace(/ğ/g, 'g')
  .replace(/ü/g, 'u')
  .replace(/ö/g, 'o')
  .replace(/ç/g, 'c');

function detectDeal(text: string): DealType | undefined {
  if (text.includes('kiral')) return 'rent';
  if (/satil|satis/.test(text)) return 'sale';
  return undefined;
}

function detectPrice(text: string): number | undefined {
  const million = text.match(/(\d+(?:[.,]\d+)?)\s*(milyon|mln)/);
  if (million) return Math.round(Number(million[1].replace(',', '.')) * 1_000_000);
  const thousand = text.match(/(\d+(?:[.,]\d+)?)\s*bin/);
  if (thousand) return Math.round(Number(thousand[1].replace(',', '.')) * 1_000);
  const plain = text.match(/\d{1,3}(?:\.\d{3})+|\d{5,}/);
  if (plain) return Number(plain[0].replace(/\./g, ''));
  return undefined;
}

function detectRooms(text: string): string | undefined {
  const match = text.match(/(\d)\s*\+\s*(\d)/);
  return match ? `${match[1]}+${match[2]}` : undefined;
}

function detectType(text: string): PropertyType | undefined {
  let best: PropertyType | undefined;
  for (const type of allPropertyTypeOptions) {
    if (text.includes(fold(type)) && (!best || type.length > best.length)) best = type;
  }
  return best;
}

function detectLocation(text: string, items: Listing[]): { city?: string; district?: string } {
  const districts = Array.from(new Set(items.map((item) => item.district)));
  const district = districts.find((name) => text.includes(fold(name)));
  if (district) return { city: items.find((item) => item.district === district)?.city, district };
  const cities = Array.from(new Set(items.map((item) => item.city)));
  return { city: cities.find((name) => text.includes(fold(name))) };
}

function mergeCriteria(current: SearchCriteria, update: SearchCriteria): SearchCriteria {
  return {
    deal: update.deal ?? current.deal,
    city: update.city ?? current.city,
    district: update.district ?? current.district,
    type: update.type ?? current.type,
    maxPrice: update.maxPrice ?? current.maxPrice,
    rooms: update.rooms ?? current.rooms,
  };
}

function isSlotFilled(criteria: SearchCriteria, slot: AgentSlot): boolean {
  switch (slot) {
    case 'deal': return criteria.deal !== undefined;
    case 'city': return criteria.city !== undefined;
    case 'type': return criteria.type !== undefined;
    case 'maxPrice': return criteria.maxPrice !== undefined;
    case 'rooms': return criteria.rooms !== undefined;
  }
}

function nextSlot(state: AgentState): AgentSlot | null {
  return SLOT_ORDER.find((slot) => !isSlotFilled(state.criteria, slot) && !state.skipped.includes(slot)) ?? null;
}

function dealOf(item: Listing): DealType {
  return item.type === 'Günlük Kiralık' ? 'rent' : 'sale';
}

function searchListings(criteria: SearchCriteria, items: Listing[]): { listings: Listing[]; exact: boolean } {
  const { deal, city, district, type, maxPrice, rooms } = criteria;
  const checks: Array<(item: Listing) => boolean> = [];
  if (deal) checks.push((item) => dealOf(item) === deal);
  if (city) checks.push((item) => fold(item.city) === fold(city));
  if (district) checks.push((item) => fold(item.district) === fold(district));
  if (type) {
    checks.push((item) => item.type === type || (type === GENERAL_COMMERCIAL_TYPE && commercialPropertyTypes.includes(item.type as typeof commercialPropertyTypes[number])));
  }
  if (maxPrice !== undefined) checks.push((item) => item.price <= maxPrice);
  if (rooms) checks.push((item) => item.rooms === rooms);
  if (checks.length === 0) return { listings: [], exact: false };

  const scored = items.map((item) => ({ item, score: checks.filter((check) => check(item)).length }));
  const exact = scored.filter((entry) => entry.score === checks.length).map((entry) => entry.item);
  if (exact.length > 0) return { listings: exact.slice(0, MAX_RESULTS), exact: true };
  const partial = scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
  return { listings: partial.slice(0, MAX_RESULTS), exact: false };
}

function describeResults(count: number, exact: boolean): string {
  if (count === 0) return 'Bu kriterlere uygun ilan bulamadım. Farklı bir arama için "yeni arama" yazabilirsiniz.';
  if (!exact) return `Tam eşleşme bulamadım, kriterlerinize en yakın ${count} ilanı gösteriyorum. Farklı bir arama için "yeni arama" yazabilirsiniz.`;
  return `Kriterlerinize uyan ${count} ilan buldum. Detayını görmek için ilanlara tıklayabilirsiniz.`;
}

export function advanceAgent(state: AgentState, input: string, items: Listing[]): { state: AgentState; reply: AgentReply } {
  const text = fold(input.trim());
  if (RESET_PATTERN.test(text)) {
    return { state: INITIAL_AGENT_STATE, reply: { text: `Yeni bir arama başlattık. ${SLOT_QUESTIONS.deal}`, results: [] } };
  }

  let next = state;
  if (SKIP_PATTERN.test(text)) {
    const skippedSlot = nextSlot(state);
    if (skippedSlot) next = { ...next, skipped: [...next.skipped, skippedSlot] };
  }

  const location = detectLocation(text, items);
  next = {
    ...next,
    criteria: mergeCriteria(next.criteria, {
      deal: detectDeal(text),
      city: location.city,
      district: location.district,
      type: detectType(text),
      maxPrice: detectPrice(text),
      rooms: detectRooms(text),
    }),
  };

  const slot = nextSlot(next);
  if (SHOW_PATTERN.test(text) || !slot) {
    const { listings: results, exact } = searchListings(next.criteria, items);
    return { state: next, reply: { text: describeResults(results.length, exact), results } };
  }
  return { state: next, reply: { text: SLOT_QUESTIONS[slot], results: [] } };
}
