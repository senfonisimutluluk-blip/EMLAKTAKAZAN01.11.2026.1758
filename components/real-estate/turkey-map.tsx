'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TURKEY_CENTER: [number, number] = [39.0, 35.5];
const TURKEY_BOUNDS: L.LatLngBoundsLiteral = [
  [35.5, 25.5],
  [42.5, 45.0],
];

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function TurkeyMap({
  latitude,
  longitude,
  onPick,
}: {
  latitude?: number | null;
  longitude?: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const hasPoint = Boolean(latitude && longitude);
    const map = L.map(containerRef.current, {
      center: hasPoint ? [latitude!, longitude!] : TURKEY_CENTER,
      zoom: hasPoint ? 14 : 6,
      maxBounds: TURKEY_BOUNDS,
      maxBoundsViscosity: 0.8,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap katkıda bulunanları',
      maxZoom: 19,
    }).addTo(map);

    if (hasPoint) {
      markerRef.current = L.marker([latitude!, longitude!], { icon: markerIcon }).addTo(map);
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
      }
      onPickRef.current(lat, lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !latitude || !longitude) return;
    mapRef.current.setView([latitude, longitude], 14);
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      markerRef.current = L.marker([latitude, longitude], { icon: markerIcon }).addTo(mapRef.current);
    }
  }, [latitude, longitude]);

  return <div ref={containerRef} className="h-full w-full" />;
}
