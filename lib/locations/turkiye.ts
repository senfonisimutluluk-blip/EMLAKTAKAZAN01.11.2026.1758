export interface TurkeyLocation { id: number; name: string; provinceId?: number; districtId?: number; }

const baseUrl = 'https://api.turkiyeapi.dev/v2';

async function requestLocations(path: string): Promise<TurkeyLocation[]> {
  const response = await fetch(`${baseUrl}/${path}`);
  if (!response.ok) throw new Error('Location request failed');
  const payload: { data?: TurkeyLocation[] } = await response.json();
  return Array.isArray(payload.data) ? payload.data : [];
}

export function getProvinces(): Promise<TurkeyLocation[]> { return requestLocations('provinces?limit=100'); }
export function getDistricts(provinceId: number): Promise<TurkeyLocation[]> { return requestLocations(`districts?provinceId=${provinceId}&limit=1000`); }
export function getNeighborhoods(districtId: number): Promise<TurkeyLocation[]> { return requestLocations(`neighborhoods?districtId=${districtId}&limit=1000`); }
