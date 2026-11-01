export {};

declare const Deno: { serve: (handler: (request: Request) => Response | Promise<Response>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { city, district, neighborhood, ada, parsel } = await req.json();

    if (!city || !district || !ada || !parsel) {
      return new Response(
        JSON.stringify({ error: "İl, ilçe, ada ve parsel alanları zorunludur." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const queryText = `${city} ${district} ${neighborhood ?? ""} ada ${ada} parsel ${parsel}`.trim();

    const geoResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryText)}&format=json&limit=1&countrycodes=tr`,
      {
        headers: {
          "User-Agent": "EMLAKTAKAZAN/1.0",
          "Accept-Language": "tr",
        },
      },
    );

    let coordinates: { lat: number; lng: number } | null = null;
    let displayName = "";

    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      if (Array.isArray(geoData) && geoData.length > 0) {
        coordinates = {
          lat: parseFloat(geoData[0].lat),
          lng: parseFloat(geoData[0].lon),
        };
        displayName = geoData[0].display_name ?? "";
      }
    }

    const fallbackQuery = `${city} ${district} ${neighborhood ?? ""}`.trim();
    if (!coordinates) {
      const fallbackResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackQuery)}&format=json&limit=1&countrycodes=tr`,
        {
          headers: {
            "User-Agent": "EMLAKTAKAZAN/1.0",
            "Accept-Language": "tr",
          },
        },
      );
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (Array.isArray(fallbackData) && fallbackData.length > 0) {
          coordinates = {
            lat: parseFloat(fallbackData[0].lat),
            lng: parseFloat(fallbackData[0].lon),
          };
          displayName = fallbackData[0].display_name ?? "";
        }
      }
    }

    const result = {
      city,
      district,
      neighborhood: neighborhood ?? null,
      ada: String(ada),
      parsel: String(parsel),
      coordinates,
      displayName,
      query: queryText,
      note: coordinates
        ? "Konum OpenStreetMap verileri kullanılarak tahmini olarak bulunmuştur. TKGM resmi parselleme verisi için tapu.gov.tr adresinden doğrulama yapılması önerilir."
        : "Belirtilen ada/parsel için konum bulunamadı. İl ve ilçe bilgisini kontrol edip tekrar deneyin.",
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Parsel sorgusu sırasında bir hata oluştu: " + (err instanceof Error ? err.message : "bilinmeyen hata") }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
