import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon path with Vite bundler
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)['_getIconUrl'];
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const TILE_URL  = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface EarthquakePoint {
  id: string;
  lat: number;
  lng: number;
  magnitude: number;
  place: string;
  time: string;
  sigClass: string;
}

interface EarthquakeMapProps {
  points: EarthquakePoint[];
  highlightId?: string | null;
  onSelectId?: (id: string) => void;
}

function magColor(mag: number): string {
  if (mag >= 6) return '#dc2626';
  if (mag >= 4) return '#f97316';
  return '#22c55e';
}

function magRadius(mag: number): number {
  return Math.max(4, mag * 2.5);
}

export function EarthquakeMap({ points, highlightId, onSelectId }: EarthquakeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markersRef   = useRef<Map<string, L.CircleMarker>>(new Map());

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 18 }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Rebuild markers when points or highlight change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    const validPoints = points.filter(p => p.lat && p.lng);
    validPoints.forEach(p => {
      const isHighlighted = p.id === highlightId;
      const color = magColor(p.magnitude);
      const marker = L.circleMarker([p.lat, p.lng], {
        radius:      isHighlighted ? magRadius(p.magnitude) + 3 : magRadius(p.magnitude),
        color:       isHighlighted ? '#ffffff' : color,
        fillColor:   color,
        fillOpacity: 0.8,
        weight:      isHighlighted ? 2.5 : 1,
      });

      marker.bindTooltip(
        `<strong>M${p.magnitude.toFixed(1)}</strong><br/>${p.place}`,
        { direction: 'top', offset: [0, -6] }
      );

      if (onSelectId) {
        marker.on('click', () => onSelectId(p.id));
      }

      marker.addTo(map);
      markersRef.current.set(p.id, marker);
    });

    if (validPoints.length > 0) {
      const bounds = L.latLngBounds(validPoints.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 8 });
    }
  }, [points, highlightId, onSelectId]);

  // Pan to highlighted marker
  useEffect(() => {
    if (!highlightId || !mapRef.current) return;
    const marker = markersRef.current.get(highlightId);
    if (marker) {
      mapRef.current.panTo(marker.getLatLng(), { animate: true, duration: 0.4 });
    }
  }, [highlightId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '280px' }}
    />
  );
}
