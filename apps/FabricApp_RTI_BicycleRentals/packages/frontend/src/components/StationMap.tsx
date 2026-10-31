import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getStationStatus } from '../lib/stationStatus';
import { createCircleMarker } from '../lib/mapMarkers';

// Fix Leaflet default icon path issue with Vite bundler
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)['_getIconUrl'];
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

export interface MapStation {
  BikepointID: number;
  Street: string;
  Neighbourhood: string;
  Latitude: number;
  Longitude: number;
  No_Bikes: number;
  No_Empty_Docks: number;
  BikesToBeFilled: number | null;
}

interface StationMapProps {
  stations: MapStation[];
  selectedId: number | null;
  onSelectStation: (id: number) => void;
}

export function StationMap({ stations, selectedId, onSelectStation }: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.CircleMarker>>(new Map());

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: [51.505, -0.09],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when stations or selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    stations.forEach(station => {
      if (!station.Latitude || !station.Longitude) return;

      const status = getStationStatus(
        station.No_Bikes,
        station.No_Empty_Docks,
        station.BikesToBeFilled
      );
      const isSelected = station.BikepointID === selectedId;
      const marker = createCircleMarker(
        station.Latitude,
        station.Longitude,
        status,
        isSelected
      );

      marker.bindTooltip(
        `<strong>${station.Street}</strong><br/>${station.Neighbourhood}<br/>🚲 ${station.No_Bikes} bikes`,
        { direction: 'top', offset: [0, -8] }
      );

      marker.on('click', () => onSelectStation(station.BikepointID));
      marker.addTo(map);
      markersRef.current.set(station.BikepointID, marker);
    });

    // Pan to selected station
    if (selectedId !== null) {
      const sel = stations.find(s => s.BikepointID === selectedId);
      if (sel?.Latitude && sel?.Longitude) {
        map.panTo([sel.Latitude, sel.Longitude], { animate: true, duration: 0.5 });
      }
    }
  }, [stations, selectedId, onSelectStation]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: '320px' }}
    />
  );
}
