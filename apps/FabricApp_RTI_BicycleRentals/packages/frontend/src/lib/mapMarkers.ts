import L from 'leaflet';
import type { StationStatus } from './stationStatus';

const STATUS_COLOURS: Record<StationStatus, string> = {
  available: '#107c10',
  low:       '#d83b01',
  empty:     '#605e5c',
  over:      '#8764b8',
  unknown:   '#605e5c',
};

export function createCircleMarker(
  lat: number,
  lng: number,
  status: StationStatus,
  isSelected: boolean
): L.CircleMarker {
  return L.circleMarker([lat, lng], {
    radius: isSelected ? 14 : 8,
    fillColor: STATUS_COLOURS[status],
    color: '#ffffff',
    weight: isSelected ? 3 : 1.5,
    opacity: 1,
    fillOpacity: isSelected ? 1 : 0.85,
  });
}
