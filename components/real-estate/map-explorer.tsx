'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Listing } from '@/lib/real-estate/types';

const TURKEY_CENTER: [number, number] = [39.0, 35.5];
const TURKEY_BOUNDS: L.LatLngBoundsLiteral = [
  [35.5, 25.5],
  [42.5, 45.0],
];

type Level = { city: string | null; district: string | null; neighborhood: string | null };
type GroupKey = 'city' | 'district' | 'neighborhood';

type SellerColor = { fill: string; border: string; };

const SELLER_COLORS: Record<string, SellerColor> = {
  owner: { fill: '#ef4444', border: '#fff' },
  agent: { fill: '#22c55e', border: '#fff' },
  constructor: { fill: '#3b82f6', border: '#fff' },
};

const PROPERTY_TYPE_ICONS: Record<string, string> = {
  'Daire': '🏠', 'Rezidans': '🏢', 'Villa': '🏡', 'Müstakil Ev': '🏠',
  'Ofis': '💼', 'Dükkan': '🏪', 'Depo': '🏭', 'Arsa': '🌳',
  'Bungalow': '🛖', 'Tiny House': '🏠', 'Butik Otel': '🏨',
  'Günlük Kiralık': '🏖️', 'Fabrika': '🏭', 'Otel': '🏨',
  'Plaza': '🏢', 'İş Hanı': '🏢', 'AVM': '🛍️', 'Çiftlik Evi': '🚜',
  'Yazlık': '🏖️', 'Kooperatif': '🏢', 'Tarla': '🌾', 'Bağ': '🍇',
  'Bahçe': '🌺', 'İmarsız': '🌲', 'Büro': '💼', 'Showroom': '🏬',
  'Restoran': '🍴', 'Atölye': '🔨', 'Bina': '🏢', 'Komple Bina': '🏢',
  'Devre Mülk': '🏖️', 'Turistik Tesis': '🏖️', 'Spor Tesisi': '🏟️',
  'Okul': '🏫', 'Otopark': '🅿️', 'Garaj & Park Yeri': '🅿️',
  'Akaryakıt İstasyonu': '⛽', 'Hamam, Sauna & Spa': '♨️',
  'Maden Ocağı': '⛏️', 'İmalathane': '🏭', 'Pazar Yeri': '🎪',
  'Toplantı & Etkinlik Salonu': '🎭', 'Apartman Dairesi': '🏢',
  'Çiftlik': '🚜', 'Ticari Gayrimenkul': '💼',
  'Yalı': '⛵', 'Yalı Dairesi': '⛵', 'Köşk & Konak': '🏛️',
};

function sellerTypeOf(listing: Listing): 'owner' | 'agent' | 'constructor' {
  if (listing.sellerType === 'agent') return 'agent';
  if (listing.sellerType === 'owner') return 'owner';
  return 'constructor';
}

function typeIconOf(type: string): string {
  return PROPERTY_TYPE_ICONS[type] ?? '📍';
}

const EMPTY_LEVEL: Level = { city: null, district: null, neighborhood: null };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

function nextGroupKey(level: Level): GroupKey | null {
  if (!level.city) return 'city';
  if (!level.district) return 'district';
  if (!level.neighborhood) return 'neighborhood';
  return null;
}

function maxZoomFor(level: Level): number {
  if (!level.city) return 6;
  if (!level.district) return 10;
  if (!level.neighborhood) return 13;
  return 15;
}

function groupMarkerIcon(label: string, count: number): L.DivIcon {
  return L.divIcon({
    className: 'map-group-marker',
    html: `<div style="display:flex;align-items:center;gap:6px;white-space:nowrap;background:#0d0d13;color:#fff;border:2px solid #f43f68;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.45);transform:translate(-50%,-50%);"><span>${escapeHtml(label)}</span><span style="background:#f43f68;border-radius:999px;padding:1px 7px;font-size:11px;">${count}</span></div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}

function listingMarkerIcon(listing: Listing): L.DivIcon {
  const sellerType = sellerTypeOf(listing);
  const color = SELLER_COLORS[sellerType] ?? SELLER_COLORS.owner;
  const icon = typeIconOf(listing.type);
  return L.divIcon({
    className: 'map-listing-marker',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${color.fill};border:2.5px solid ${color.border};box-shadow:0 2px 8px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font-size:12px;line-height:1;transform:translate(-50%,-50%);">${icon}</div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function MapExplorer({ listings, onSelect }: { listings: Listing[]; onSelect: (listing: Listing) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const [level, setLevel] = useState<Level>(EMPTY_LEVEL);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: TURKEY_CENTER,
      zoom: 6,
      minZoom: 5,
      maxBounds: TURKEY_BOUNDS,
      maxBoundsViscosity: 0.8,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap katkıda bulunanları',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  const scoped = useMemo(
    () => listings.filter((item) =>
      (!level.city || item.city === level.city) &&
      (!level.district || item.district === level.district) &&
      (!level.neighborhood || item.neighborhood === level.neighborhood)),
    [listings, level],
  );

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const points: L.LatLngExpression[] = [];
    const groupKey = nextGroupKey(level);

    if (groupKey) {
      const groups = new Map<string, Listing[]>();
      for (const item of scoped) {
        const key = item[groupKey];
        if (!key || !item.coordinates) continue;
        groups.set(key, [...(groups.get(key) ?? []), item]);
      }
      groups.forEach((items, label) => {
        const lat = average(items.map((item) => item.coordinates?.lat ?? 0));
        const lng = average(items.map((item) => item.coordinates?.lng ?? 0));
        points.push([lat, lng]);
        L.marker([lat, lng], { icon: groupMarkerIcon(label, items.length), keyboard: true, title: label })
          .on('click', () => setLevel((current) => ({ ...current, [groupKey]: label })))
          .addTo(layer);
      });
    } else {
      for (const item of scoped) {
        if (!item.coordinates) continue;
        const { lat, lng } = item.coordinates;
        points.push([lat, lng]);
        L.marker([lat, lng], { icon: listingMarkerIcon(item), title: item.title })
          .on('click', () => onSelectRef.current(item))
          .addTo(layer);
      }
    }

    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points as L.LatLngExpression[]), { padding: [80, 80], maxZoom: maxZoomFor(level) });
    } else {
      map.setView(TURKEY_CENTER, 6);
    }
  }, [scoped, level]);

  const crumbs: Array<{ label: string; level: Level }> = [{ label: 'Türkiye', level: EMPTY_LEVEL }];
  if (level.city) crumbs.push({ label: level.city, level: { city: level.city, district: null, neighborhood: null } });
  if (level.district) crumbs.push({ label: level.district, level: { city: level.city, district: level.district, neighborhood: null } });
  if (level.neighborhood) crumbs.push({ label: level.neighborhood, level: level });

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-4 right-4 top-4 z-[1000] flex flex-wrap items-center gap-2">
        <nav aria-label="Konum seçimi" className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-full bg-[#0d0d13]/90 px-3 py-2 text-xs font-semibold text-[#c9c9d3] shadow-lg backdrop-blur-md">
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <span className="text-[#5d5d6b]">/</span>}
              <button
                onClick={() => setLevel(crumb.level)}
                disabled={index === crumbs.length - 1}
                className="rounded-full px-2 py-1 transition hover:text-white disabled:cursor-default disabled:text-white"
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </nav>
        <span className="pointer-events-auto rounded-full bg-[#0d0d13]/90 px-3 py-2 text-xs font-semibold text-[#c9c9d3] shadow-lg backdrop-blur-md">{scoped.length} ilan</span>
      </div>
      <div className="pointer-events-auto absolute bottom-4 left-4 z-[1000] flex flex-col gap-1.5 rounded-2xl bg-[#0d0d13]/90 px-4 py-3 text-[10px] font-semibold text-[#c9c9d3] shadow-lg backdrop-blur-md">
        <span className="mb-1 text-[9px] uppercase tracking-[.12em] text-[#777687]">Satıcı tipi</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full border border-white" style={{ backgroundColor: SELLER_COLORS.owner.fill }} /> Mülk sahibi</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full border border-white" style={{ backgroundColor: SELLER_COLORS.agent.fill }} /> Emlakçı</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full border border-white" style={{ backgroundColor: SELLER_COLORS['constructor'].fill }} /> İnşaat firması</span>
      </div>
    </div>
  );
}
