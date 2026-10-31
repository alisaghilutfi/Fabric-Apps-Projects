export type StationStatus = 'available' | 'low' | 'empty' | 'over' | 'unknown';

export function getStationStatus(
  noBikes: number,
  noEmptyDocks: number,
  bikesToBeFilled: number | null
): StationStatus {
  const capacity = noBikes + noEmptyDocks;
  if (capacity === 0) return 'unknown';
  if (bikesToBeFilled !== null && bikesToBeFilled < 0) return 'over';
  const pct = noBikes / capacity;
  if (pct === 0) return 'empty';
  if (pct < 0.2) return 'low';
  return 'available';
}

export const statusConfig: Record<StationStatus, {
  label: string;
  bg: string;
  text: string;
  border: string;
  bar: string;
}> = {
  available: {
    label: 'Available',
    bg: 'bg-[var(--color-status-available-surface)]',
    text: 'text-[var(--color-status-available)]',
    border: 'border-l-[var(--color-status-available)]',
    bar: 'bg-[var(--color-status-available)]',
  },
  low: {
    label: 'Low',
    bg: 'bg-[var(--color-status-low-surface)]',
    text: 'text-[var(--color-status-low)]',
    border: 'border-l-[var(--color-status-low)]',
    bar: 'bg-[var(--color-status-low)]',
  },
  empty: {
    label: 'Empty',
    bg: 'bg-[var(--color-status-empty-surface)]',
    text: 'text-[var(--color-status-empty)]',
    border: 'border-l-[var(--color-status-empty)]',
    bar: 'bg-[var(--color-status-empty)]',
  },
  over: {
    label: 'Full',
    bg: 'bg-[var(--color-status-over-surface)]',
    text: 'text-[var(--color-status-over)]',
    border: 'border-l-[var(--color-status-over)]',
    bar: 'bg-[var(--color-status-over)]',
  },
  unknown: {
    label: '—',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-l-muted',
    bar: 'bg-muted-foreground',
  },
};
