export {};

declare const Deno: { serve: (handler: (request: Request) => Response | Promise<Response>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function nominatimSearch(query: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=tr`,
    {
      headers: {
        "User-Agent": "EMLAKTAKAZAN/1.0",
        "Accept-Language": "tr",
      },
    },
  );
  if (!response.ok) return null;
  const data = await response.json();
  if (Array.isArray(data) && data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name ?? "",
    };
  }
  return null;
}

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

    const neighborhoodStr = neighborhood ?? "";
    let coordinates: { lat: number; lng: number } | null = null;
    let displayName = "";

    // Attempt 1: full query with ada/parsel
    const fullQuery = `${city} ${district} ${neighborhoodStr} ada ${ada} parsel ${parsel}`.trim();
    const result1 = await nominatimSearch(fullQuery);
    if (result1) {
      coordinates = { lat: result1.lat, lng: result1.lng };
      displayName = result1.displayName;
    }

    // Attempt 2: city + district + neighborhood (without ada/parsel)
    if (!coordinates && neighborhoodStr) {
      const result2 = await nominatimSearch(`${city} ${district} ${neighborhoodStr}`.trim());
      if (result2) {
        coordinates = { lat: result2.lat, lng: result2.lng };
        displayName = result2.displayName;
      }
    }

    // Attempt 3: city + district only
    if (!coordinates) {
      const result3 = await nominatimSearch(`${city} ${district}`.trim());
      if (result3) {
        coordinates = { lat: result3.lat, lng: result3.lng };
        displayName = result3.displayName;
      }
    }

    // Attempt 4: city only (last resort - at least center the map in the right province)
    if (!coordinates) {
      const result4 = await nominatimSearch(city.trim());
      if (result4) {
        coordinates = { lat: result4.lat, lng: result4.lng };
        displayName = result4.displayName;
      }
    }

    const result = {
      city,
      district,
      neighborhood: neighborhoodStr || null,
      ada: String(ada),
      parsel: String(parsel),
      coordinates,
      displayName,
      query: fullQuery,
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
