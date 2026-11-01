import { supabase } from '@/lib/supabase/client';

import type { SellerDetails } from '@/lib/real-estate/types';

export async function createListing(input: {
  title: string; description: string; propertyType: string; city: string; district: string; neighborhood: string;
  price: number; area: number; rooms: string; floor: string; features: string[]; details: Record<string, string>;
  latitude?: number; longitude?: number; imageUrls?: string[]; videoUrl?: string | null; seller: SellerDetails;
}) {
  const isAgent = input.seller.sellerType === 'agent';
  return supabase.from('listings').insert({
    title: input.title, description: input.description, property_type: input.propertyType, city: input.city,
    district: input.district, neighborhood: input.neighborhood, price: input.price, area: input.area,
    rooms: input.rooms, floor: input.floor, features: input.features, details: input.details,
    latitude: input.latitude ?? null, longitude: input.longitude ?? null,
    image_urls: input.imageUrls ?? [],
    video_url: input.videoUrl ?? null,
    seller_type: input.seller.sellerType,
    property_number: input.seller.propertyNumber.trim(),
    agent_office_name: isAgent ? input.seller.agentOfficeName.trim() : null,
    agent_authority_number: isAgent ? input.seller.agentAuthorityNumber.trim() : null,
    agent_myk_number: isAgent ? input.seller.agentMykNumber.trim() : null,
    authority_document_path: isAgent ? input.seller.authorityDocumentPath : null,
  }).select('id').maybeSingle();
}

export interface PropertyAnalysis {
  score: 'Fırsat' | 'Dengeli' | 'Yüksek';
  low: number;
  high: number;
  pricePerSquareMeter: number;
  estimatedMonthlyRent: number;
  annualYield: number;
  confidence: number;
  note: string;
  suggestions: string[];
}

export async function analyzeListingPrice(input: { city: string; district: string; propertyType: string; area: number; price: number }): Promise<PropertyAnalysis> {
  await new Promise((resolve) => window.setTimeout(resolve, 500));
  const normalizedLocation = `${input.city} ${input.district}`.toLocaleLowerCase('tr-TR');
  const premiumFactor = /istanbul|bodrum|çeşme|foça|datça|kaş|konyaaltı/.test(normalizedLocation) ? 1.2 : /ankara|konya|kayseri/.test(normalizedLocation) ? 0.82 : 1;
  const daily = input.propertyType === 'Günlük Kiralık';
  const reference = daily ? input.area * 35 * premiumFactor : input.area * 95000 * premiumFactor;
  const ratio = input.price > 0 ? input.price / reference : 1;
  const score: PropertyAnalysis['score'] = ratio < 0.9 ? 'Fırsat' : ratio > 1.15 ? 'Yüksek' : 'Dengeli';
  const monthlyRent = daily ? input.area * 35 * 22 * premiumFactor : input.area * 420 * premiumFactor;
  const annualYield = input.price > 0 ? (monthlyRent * 12 / input.price) * 100 : 0;
  const suggestions = score === 'Yüksek' ? ['Fiyatı bölgesel aralığa yaklaştırın.', 'Fotoğraf ve açıklama kalitesini artırın.'] : score === 'Fırsat' ? ['Vitrin görünürlüğünü artırmayı düşünün.', 'Tapu ve kullanım bilgilerini eksiksiz ekleyin.'] : ['İlanı benzer mülklerle birlikte izleyin.', 'Konum ve ulaşım avantajlarını açıklamada öne çıkarın.'];
  return { score, low: Math.round(reference * 0.9), high: Math.round(reference * 1.1), pricePerSquareMeter: input.area > 0 ? Math.round(input.price / input.area) : 0, estimatedMonthlyRent: Math.round(monthlyRent), annualYield: Number(annualYield.toFixed(1)), confidence: daily ? 68 : 74, note: `${input.city} / ${input.district} için girilen bilgilerle oluşturulan ön değerlendirme. Canlı piyasa verisi bağlandığında model yeniden kalibre edilir.`, suggestions };
}
