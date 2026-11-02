export interface TurkeyLocation { id: number; name: string; provinceId?: number; districtId?: number; }

const baseUrl = 'https://api.turkiyeapi.dev/v2';

async function requestLocations(path: string): Promise<TurkeyLocation[]> {
  const response = await fetch(`${baseUrl}/${path}`);
  if (!response.ok) throw new Error(`Location request failed: ${response.status}`);
  const payload: { data?: TurkeyLocation[] } = await response.json();
  return Array.isArray(payload.data) ? payload.data : [];
}

export function getProvinces(): Promise<TurkeyLocation[]> {
  return requestLocations('provinces?limit=100');
}

export async function getDistricts(provinceId: number): Promise<TurkeyLocation[]> {
  const all: TurkeyLocation[] = [];
  let page = 1;
  while (true) {
    const batch = await requestLocations(`districts?provinceId=${provinceId}&limit=100&page=${page}`);
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
    if (page > 20) break;
  }
  return all;
}

export async function getNeighborhoods(districtId: number): Promise<TurkeyLocation[]> {
  const all: TurkeyLocation[] = [];
  let page = 1;
  while (true) {
    const batch = await requestLocations(`neighborhoods?districtId=${districtId}&limit=100&page=${page}`);
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
    if (page > 50) break;
  }
  return all;
}
