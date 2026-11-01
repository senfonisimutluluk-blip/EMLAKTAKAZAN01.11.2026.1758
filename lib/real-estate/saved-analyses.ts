import { supabase } from '@/lib/supabase/client';

export interface SavedAnalysis {
  id: string;
  title: string;
  city: string;
  district: string;
  neighborhood: string | null;
  property_type: string;
  area: number;
  listing_mode: string;
  low: number;
  high: number;
  price_per_square_meter: number;
  unit: string;
  confidence: number;
  summary: string;
  report_json: Array<{ title: string; body: string }> | null;
  signals_json: Array<{ title: string; snippet: string; url: string }> | null;
  created_at: string;
}

export async function fetchSavedAnalyses(userId: string): Promise<SavedAnalysis[]> {
  const { data, error } = await supabase
    .from('saved_ai_analyses')
    .select('id, title, city, district, neighborhood, property_type, area, listing_mode, low, high, price_per_square_meter, unit, confidence, summary, report_json, signals_json, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedAnalysis[];
}

export async function saveAnalysis(userId: string, analysis: {
  title: string;
  city: string;
  district: string;
  neighborhood: string;
  propertyType: string;
  area: number;
  listingMode: string;
  low: number;
  high: number;
  pricePerSquareMeter: number;
  unit: string;
  confidence: number;
  summary: string;
  report: Array<{ title: string; body: string }>;
  signals: Array<{ title: string; snippet: string; url: string }>;
}): Promise<void> {
  const { error } = await supabase.from('saved_ai_analyses').insert({
    user_id: userId,
    title: analysis.title,
    city: analysis.city,
    district: analysis.district,
    neighborhood: analysis.neighborhood || null,
    property_type: analysis.propertyType,
    area: analysis.area,
    listing_mode: analysis.listingMode,
    low: analysis.low,
    high: analysis.high,
    price_per_square_meter: analysis.pricePerSquareMeter,
    unit: analysis.unit,
    confidence: analysis.confidence,
    summary: analysis.summary,
    report_json: analysis.report,
    signals_json: analysis.signals,
  });
  if (error) throw error;
}

export async function deleteSavedAnalysis(analysisId: string): Promise<void> {
  const { error } = await supabase.from('saved_ai_analyses').delete().eq('id', analysisId);
  if (error) throw error;
}
