export {};

declare const Deno: { serve: (handler: (request: Request) => Response | Promise<Response>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type ListingMode = "satilik" | "kiralik";
type AnalysisInput = {
  city: string; district: string; neighborhood: string; propertyType: string; area: number;
  listingMode: ListingMode; features: string[]; details: Record<string, string>;
};
type SearchSignal = { title: string; snippet: string; url: string };
type ReportSection = { title: string; body: string };
type Adjustment = { label: string; factor: number };

const trNumber = (value: number) => Math.round(value).toLocaleString("tr-TR");

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanFeatures(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 80)).filter(Boolean).slice(0, 80);
}

function cleanDetails(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
    if (typeof item === "string" && item.trim()) result[key.slice(0, 60)] = item.trim().slice(0, 200);
  }
  return result;
}

function parseSignals(html: string): SearchSignal[] {
  const results: SearchSignal[] = [];
  const blocks = html.match(/<a[^>]+class="result__a"[\s\S]*?<\/a>[\s\S]*?(?=<a[^>]+class="result__a"|$)/g) ?? [];
  for (const block of blocks.slice(0, 8)) {
    const title = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/)?.[1]?.replace(/<[^>]+>/g, "").trim();
    const snippet = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a|class="result__snippet"[^>]*>([\s\S]*?)<\//)?.[1]?.replace(/<[^>]+>/g, "").trim();
    const url = block.match(/class="result__url"[^>]*>([\s\S]*?)<\//)?.[1]?.replace(/<[^>]+>/g, "").trim();
    if (title && snippet) results.push({ title, snippet, url: url ?? "" });
  }
  return results;
}

const buildingAgeFactor: Record<string, number> = {
  "0 (Yeni)": 1.08, "1": 1.05, "2": 1.04, "3": 1.03, "4": 1.02, "5": 1.01,
  "6-10 arası": 1, "11-15 arası": 0.96, "16-20 arası": 0.92, "21 ve üzeri": 0.85,
};

function featureAdjustments(input: AnalysisInput): Adjustment[] {
  const adjustments: Adjustment[] = [];
  const age = input.details["Bina yaşı"];
  if (age && buildingAgeFactor[age] !== undefined) adjustments.push({ label: `Bina yaşı: ${age}`, factor: buildingAgeFactor[age] });
  const has = (name: string) => input.features.some((feature) => feature.toLocaleLowerCase("tr-TR").includes(name));
  if (has("deniz") || has("denize sıfır")) adjustments.push({ label: "Deniz manzarası / denize yakınlık", factor: 1.08 });
  if (has("havuz")) adjustments.push({ label: "Yüzme havuzu", factor: 1.04 });
  if (has("metro") || has("metrobüs") || has("tramvay")) adjustments.push({ label: "Raylı toplu taşıma erişimi", factor: 1.03 });
  if (input.details["Otopark"] && input.details["Otopark"] !== "Yok") adjustments.push({ label: "Otopark", factor: 1.03 });
  if (input.details["Eşyalı"] === "Evet") adjustments.push({ label: "Eşyalı", factor: 1.02 });
  if (input.details["Isıtma"] === "Yok") adjustments.push({ label: "Isıtma sistemi yok", factor: 0.97 });
  if (input.details["Tapu durumu"] === "Hisseli tapu" || input.details["Tapu durumu"] === "Tarla tapulu") adjustments.push({ label: "Hisseli / tarla tapu riski", factor: 0.94 });
  return adjustments;
}

function estimate(input: AnalysisInput, signals: SearchSignal[]) {
  const isRent = input.listingMode === "kiralik";
  const location = `${input.city} ${input.district} ${input.neighborhood}`.toLocaleLowerCase("tr-TR");
  const premium = /istanbul|bodrum|çeşme|alaçatı|kaş|konyaaltı|beşiktaş/.test(location) ? 1.22 : /sapanca|abant|foça|urla|ayvalık/.test(location) ? 1.08 : 1;
  const typeFactor = ["Arsa", "İmarsız", "Tarla", "Bağ", "Bahçe"].includes(input.propertyType) ? 0.58 : ["Bungalow", "Tiny House", "Butik Otel", "Günlük Kiralık"].includes(input.propertyType) ? 1.3 : 1;
  const adjustments = featureAdjustments(input);
  const featureFactor = adjustments.reduce((total, item) => total * item.factor, 1);
  const webText = signals.map((item) => `${item.title} ${item.snippet}`).join(" ");
  const minimumAmount = isRent ? 3000 : 10000;
  const amounts = Array.from(webText.matchAll(/([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)\s*(?:TL|₺)/gi))
    .map((match) => Number(match[1].replace(/[.,]/g, "")))
    .filter((value) => value > minimumAmount && value < 500000000);
  const webAverage = amounts.length ? amounts.reduce((total, value) => total + value, 0) / amounts.length : 0;
  const isIzmir = input.city.toLocaleLowerCase("tr-TR") === "izmir";
  const basePerSquareMeter = (isRent ? (isIzmir ? 420 : 360) : (isIzmir ? 94000 : 78000)) * premium * typeFactor * featureFactor;
  const reference = webAverage > 0 ? basePerSquareMeter * 0.65 + (webAverage / Math.max(input.area, 1)) * 0.35 : basePerSquareMeter;
  const spread = isRent ? 0.12 : 0.1;
  const low = Math.round(reference * input.area * (1 - spread));
  const high = Math.round(reference * input.area * (1 + spread));
  const unit = isRent ? "TL/ay" : "TL";
  const modeLabel = isRent ? "kiralık" : "satılık";
  const confidence = Math.min(88, 54 + signals.length * 5 + (amounts.length ? 10 : 0));
  const summary = `${input.city} ${input.district} bölgesindeki ${input.area} m² ${input.propertyType} için ${modeLabel} tahmini değer ${trNumber(low)} - ${trNumber(high)} ${unit}. Bu değer ${signals.length} web kaynağı ve ${adjustments.length} özellik düzeltmesiyle hesaplandı.`;

  const sampleListings = signals.length
    ? signals.slice(0, 6).map((item) => `- ${item.title}${item.url ? ` (${item.url})` : ""}`).join("\n")
    : "Arama sonucu alınamadı; örnek ilan bulunamadı.";

  const risks = [
    input.details["Bina yaşı"] ? null : "Bina yaşı belirtilmemiş; bina yaşı girildiğinde değerleme daha isabetli olur.",
    adjustments.some((item) => item.label.includes("tapu riski")) ? "Tapu durumu hisseli veya tarla olarak girilmiş; bu durum satış ve kredi sürecini uzatabilir." : null,
    signals.length === 0 ? "Canlı web verisi bulunamadığı için sonuç ön tahmin niteliğindedir." : null,
  ].filter((item): item is string => Boolean(item));

  const report: ReportSection[] = [
    { title: "Özet", body: summary },
    { title: "Piyasa bağlamı", body: `${input.city} ${input.district} için ${modeLabel} ${input.propertyType.toLocaleLowerCase("tr-TR")} piyasası web kaynaklarında tarandı (${signals.length} kaynak). ${premium > 1 ? "Bölge, yüksek talepli bir konum olduğu için prim katsayısı uygulandı." : "Bölge standart konum katsayısıyla değerlendirildi."}` },
    { title: "Hesaplama", body: `Bölgesel ${isRent ? "aylık m² kira" : "m² değer"} taban fiyatı ${trNumber(basePerSquareMeter / featureFactor)} TL, konum katsayısı ${premium}, emlak tipi katsayısı ${typeFactor}, özellik katsayısı ${featureFactor.toFixed(2)}. Web sinyallerinden çıkan ortalama tutar ${webAverage ? `${trNumber(webAverage)} TL` : "bulunamadı"}; sonuç %65 bölgesel taban, %35 web sinyali ağırlığıyla harmanlandı.` },
    { title: "Özellik etkileri", body: adjustments.length ? adjustments.map((item) => `- ${item.label}: %${Math.round((item.factor - 1) * 100)}`).join("\n") : "Belirtilen özellik yok; bölge ortalaması kullanıldı." },
    { title: "Örnek ilanlar ve kaynaklar", body: sampleListings },
    { title: "Riskler ve dikkat edilecekler", body: risks.length ? risks.map((item) => `- ${item}`).join("\n") : "Belirgin bir risk tespit edilmedi." },
    { title: "Sonuç", body: `Bu rapor ${modeLabel} değerlendirme için ön bilgi amaçlıdır. Kesin fiyat kararı öncesi güncel ilanlar ve yerinde inceleme ile doğrulayın.` },
  ];

  return { listingMode: input.listingMode, summary, low, high, unit, pricePerSquareMeter: Math.round(reference), sourceCount: signals.length, confidence, signals: signals.slice(0, 6), report };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const body = await request.json() as Record<string, unknown>;
    const listingMode = body.listingMode === "kiralik" ? "kiralik" : body.listingMode === "satilik" ? "satilik" : null;
    const input: AnalysisInput = {
      city: clean(body.city, 60), district: clean(body.district, 60), neighborhood: clean(body.neighborhood, 80),
      propertyType: clean(body.propertyType, 40), area: Number(body.area), listingMode: listingMode ?? "satilik",
      features: cleanFeatures(body.features), details: cleanDetails(body.details),
    };
    if (!listingMode) return response({ error: "Satılık mı kiralık mı olduğunu seçin." }, 400);
    if (!input.city || !input.district || !input.propertyType || !Number.isFinite(input.area) || input.area < 1 || input.area > 100000) return response({ error: "Geçerli konum ve metrekare bilgisi gerekli." }, 400);
    const modeWord = input.listingMode === "kiralik" ? "kiralık" : "satılık";
    const query = encodeURIComponent(`${input.city} ${input.district} ${input.neighborhood} ${input.propertyType} ${modeWord} emlak ilanları fiyatları m2`);
    const searchResponse = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, { headers: { "User-Agent": "EMLAKTAKAZAN-market-analysis/1.0" } });
    const html = searchResponse.ok ? await searchResponse.text() : "";
    return response(estimate(input, parseSignals(html)));
  } catch (_error) {
    return response({ error: "Analiz servisine şu anda ulaşılamıyor." }, 500);
  }
});
