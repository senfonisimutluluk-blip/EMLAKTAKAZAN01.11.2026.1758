'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function ListingLocationMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { center: [lat, lng], zoom: 14, scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap katkıda bulunanları',
      maxZoom: 19,
    }).addTo(map);
    L.circleMarker([lat, lng], { radius: 10, color: '#f43f68', fillColor: '#f43f68', fillOpacity: 0.85 }).addTo(map);
    return () => { map.remove(); };
  }, [lat, lng]);

  return <div ref={containerRef} className="h-72 w-full overflow-hidden rounded-2xl" />;
}
