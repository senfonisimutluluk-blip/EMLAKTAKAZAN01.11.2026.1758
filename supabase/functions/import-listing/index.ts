export {};

declare const Deno: { serve: (handler: (request: Request) => Response | Promise<Response>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_HOST = "sahibinden.com";
const FETCH_TIMEOUT_MS = 15000;
const MAX_HTML_CHARACTERS = 2_000_000;

type ImportedDraft = {
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

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function parseAllowedUrl(raw: unknown): URL | null {
  if (typeof raw !== "string") return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:") return null;
  if (host !== ALLOWED_HOST && !host.endsWith(`.${ALLOWED_HOST}`)) return null;
  return url;
}

async function fetchListingPage(url: URL): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const page = await fetch(url, {
      headers: { "Accept": "text/html", "Accept-Language": "tr-TR,tr;q=0.9" },
      redirect: "manual",
      signal: controller.signal,
    });
    if (!page.ok) return null;
    const html = await page.text();
    return html.slice(0, MAX_HTML_CHARACTERS);
  } catch (cause) {
    console.error("listing page fetch failed", cause);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function metaContent(html: string, key: string): string | null {
  const direct = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i");
  const reversed = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, "i");
  const value = decodeEntities((html.match(direct) ?? html.match(reversed))?.[1] ?? "").trim();
  return value || null;
}

function labeledValues(html: string): Record<string, string> {
  const values: Record<string, string> = {};
  const pattern = /<li[^>]*>\s*<strong[^>]*>([\s\S]*?)<\/strong>\s*<span[^>]*>([\s\S]*?)<\/span>\s*<\/li>/gi;
  for (const match of Array.from(html.matchAll(pattern))) {
    const label = stripTags(match[1]);
    const value = stripTags(match[2]);
    if (label && value && !(label in values)) values[label] = value.slice(0, 200);
  }
  return values;
}

function findValue(values: Record<string, string>, matcher: RegExp): string | null {
  const key = Object.keys(values).find((label) => matcher.test(label));
  return key ? values[key] : null;
}

function parseNumber(text: string | null): number | null {
  if (!text) return null;
  const digits = text.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number(digits);
  return value > 0 ? value : null;
}

function extractDraft(html: string): ImportedDraft {
  const values = labeledValues(html);
  const h1 = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  const priceText = stripTags(html.match(/class="[^"]*classifiedPrice[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ?? "");
  const description = stripTags(html.match(/class="[^"]*classifiedDescription[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "");

  return {
    title: metaContent(html, "og:title") ?? (h1 || null),
    description: description || metaContent(html, "og:description"),
    price: parseNumber(priceText) ?? parseNumber(metaContent(html, "product:price:amount")),
    area: parseNumber(findValue(values, /m²|metrekare/i)),
    rooms: findValue(values, /oda sayısı/i),
    floor: findValue(values, /bulunduğu kat/i),
    buildingAge: findValue(values, /^bina yaşı$/i),
    propertyTypeLabel: findValue(values, /emlak tipi/i),
    locationHint: findValue(values, /^konum$/i),
  };
}

function hasUsableContent(draft: ImportedDraft): boolean {
  return Boolean(draft.title || draft.price || draft.description);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await request.json().catch(() => null);
    const url = parseAllowedUrl(body?.url);
    if (!url) {
      return response({ error: "Lütfen sahibinden.com üzerindeki bir ilan bağlantısını girin." }, 400);
    }

    const html = await fetchListingPage(url);
    if (!html) {
      return response({ error: "İlan sayfasına ulaşılamadı. Site isteği engelliyor olabilir." }, 502);
    }

    const draft = extractDraft(html);
    if (!hasUsableContent(draft)) {
      return response({ error: "İlan bilgileri okunamadı. Bilgileri elle girebilirsiniz." }, 422);
    }

    return response({ draft });
  } catch (cause) {
    console.error("import-listing failed", cause);
    return response({ error: "İlan çekilirken beklenmeyen bir hata oluştu." }, 500);
  }
});
