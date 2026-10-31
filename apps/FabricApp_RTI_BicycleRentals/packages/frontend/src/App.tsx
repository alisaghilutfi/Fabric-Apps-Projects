import { useState, useRef, useCallback, useEffect } from 'react';
import { getRayfinClient } from './lib/rayfin-client';
import { useAppTheme } from './hooks/use-theme';
import { cn } from './lib/utils';
import { getStationStatus, statusConfig } from './lib/stationStatus';
import { BackgroundGallery } from './components/BackgroundGallery';

const BG_IMAGES = [
  // Race / action shots
  'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=1920&q=80', // two helmeted road cyclists, beach road
  'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1920&q=80', // cycling race peloton
  'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?w=1920&q=80', // solo cyclist mountain road
  // Bike sharing stations
  'https://images.pexels.com/photos/3671179/pexels-photo-3671179.jpeg?w=1920&q=80', // teal rental bikes Beijing
  'https://images.pexels.com/photos/2870243/pexels-photo-2870243.jpeg?w=1920&q=80', // colourful numbered rental bikes
  'https://images.pexels.com/photos/12217616/pexels-photo-12217616.jpeg?w=1920&q=80', // Citi Bike docking station NYC
];

function AppHeader({
  isDark,
  toggleTheme,
  back,
  backLabel,
  showLiveDot,
  isError,
}: {
  isDark: boolean;
  toggleTheme: () => void;
  back?: () => void;
  backLabel?: string;
  showLiveDot?: boolean;
  isError?: boolean;
}) {
  return (
    <header className="flex items-center justify-between px-600 py-300 border-b border-border bg-background/80 dark:bg-background/85 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-300">
        {back && (
          <button
            onClick={back}
            className="text-muted-foreground hover:text-foreground transition-colors text-300 flex items-center gap-100 mr-200"
          >
            ← {backLabel}
          </button>
        )}
        <span className="text-400 font-semibold tracking-tight text-foreground">
          🚲 Bicycle Rentals — Live Monitor
        </span>
        {showLiveDot && (
          <span
            className={cn(
              'inline-block w-2 h-2 rounded-full ml-2 align-middle',
              isError ? 'bg-[var(--color-status-empty)]' : 'live-dot bg-[var(--color-status-available)]'
            )}
            title={isError ? 'Connection error' : 'Live — updating every 30s'}
          />
        )}
      </div>
      <button
        onClick={toggleTheme}
        className="text-200 text-muted-foreground hover:text-foreground transition-colors px-300 py-100 rounded-md border border-border"
        aria-label="Toggle theme"
      >
        {isDark ? '☀ Light' : '☾ Dark'}
      </button>
    </header>
  );
}

type Screen = 'overview' | 'detail' | 'rebalancing';

interface StationRow {
  BikepointID: number;
  Street: string;
  Neighbourhood: string;
  Latitude: number;
  Longitude: number;
  No_Bikes: number;
  No_Empty_Docks: number;
  BikesToBeFilled: number;
  Action: string;
  Timestamp: string;
}

interface KpiRow { name: string; value: string | number | null; }

const KPI_LABELS: Record<string, string> = {
  'Avg Bikes Available': 'AVG BIKES',
  '% Stations Low Stock': 'LOW STOCK %',
  'Network Utilization %': 'UTILIZATION %',
  'Latest Snapshot Time': 'LAST SNAPSHOT',
};

function fmt(value: string | number | null, name?: string): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    if (name?.includes('%')) return (value * 100).toFixed(1) + '%';
    if (name?.toLowerCase().includes('time')) return new Date(value).toLocaleTimeString();
    return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  if (name?.toLowerCase().includes('time') || name?.toLowerCase().includes('snapshot')) {
    const d = new Date(String(value));
    if (!isNaN(d.getTime())) return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  }
  return String(value);
}


function BikeBg() {
  return (
    <svg
      viewBox="0 0 800 200"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full opacity-[0.06]"
      aria-hidden="true"
    >
      {/* simplified bicycle silhouette */}
      <circle cx="200" cy="120" r="60" fill="none" stroke="currentColor" strokeWidth="8" />
      <circle cx="600" cy="120" r="60" fill="none" stroke="currentColor" strokeWidth="8" />
      <circle cx="200" cy="120" r="10" fill="currentColor" />
      <circle cx="600" cy="120" r="10" fill="currentColor" />
      <line x1="200" y1="120" x2="400" y2="60" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <line x1="400" y1="60" x2="600" y2="120" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <line x1="400" y1="60" x2="400" y2="120" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <line x1="370" y1="120" x2="430" y2="120" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <line x1="380" y1="60" x2="430" y2="50" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <line x1="430" y1="45" x2="430" y2="65" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const { isDark, toggleTheme } = useAppTheme();
  const [screen, setScreen] = useState<Screen>('overview');
  const [kpis, setKpis] = useState<KpiRow[]>([]);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [selected, setSelected] = useState<StationRow | null>(null);
  const [rebalanceStations, setRebalanceStations] = useState<StationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isError, setIsError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [subDone, setSubDone] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSnapshot = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const client = await getRayfinClient();

      const kpiResult = await client.connectors.sm_rti_bicyclerentals.executeQuery({
        query: `EVALUATE ROW(
          "Total Stations", [Total Stations],
          "Avg Bikes Available", [Avg Bikes Available],
          "Avg Empty Docks", [Avg Empty Docks],
          "% Stations Low Stock", [% Stations Low Stock],
          "Network Utilization %", [Network Utilization %],
          "Latest Snapshot Time", [Latest Snapshot Time]
        )`,
      });

      const kpiRows: KpiRow[] =
        kpiResult.status === 'success' && kpiResult.table.rows.length > 0
          ? kpiResult.table.columns.map((col, i) => ({
              name: col.name.replace(/^\[|\]$/g, '').trim(),
              value: kpiResult.table.rows[0][i] as string | number | null,
            }))
          : [];

      const stationResult = await client.connectors.sm_rti_bicyclerentals.executeQuery({
        query: `EVALUATE TOPN(120, 'Station Snapshot', 'Station Snapshot'[BikepointID], ASC)`,
      });

      const stationRows: StationRow[] =
        stationResult.status === 'success'
          ? stationResult.table.rows.map(row => {
              const cols = stationResult.table.columns.map(c =>
                c.name.includes('[') ? c.name.split('[')[1].replace(']', '') : c.name
              );
              const obj: Record<string, unknown> = {};
              cols.forEach((col, i) => { obj[col] = row[i]; });
              return obj as unknown as StationRow;
            })
          : [];

      setKpis(kpiRows);
      setStations(stationRows);
      setIsError(false);
      setLastUpdated(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Query failed');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    fetchSnapshot();
    intervalRef.current = setInterval(fetchSnapshot, 30_000);
  }, [fetchSnapshot]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function loadRebalancing() {
    setError('');
    setLoading(true);
    try {
      const client = await getRayfinClient();

      const result = await client.connectors.sm_rti_bicyclerentals.executeQuery({
        query: `EVALUATE FILTER('Station Snapshot', 'Station Snapshot'[Action] <> "OK")`,
      });

      const rows: StationRow[] =
        result.status === 'success'
          ? result.table.rows.map(row => {
              const cols = result.table.columns.map(c =>
                c.name.includes('[') ? c.name.split('[')[1].replace(']', '') : c.name
              );
              const obj: Record<string, unknown> = {};
              cols.forEach((col, i) => { obj[col] = row[i]; });
              return obj as unknown as StationRow;
            })
          : [];

      setRebalanceStations(rows);
      setScreen('rebalancing');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(station: StationRow) {
    setLoading(true);
    try {
      const client = await getRayfinClient();
      const session = client.auth.getSession();
      await client.data.AlertSubscription.create({
        stationId: station.BikepointID,
        street: station.Street,
        neighbourhood: station.Neighbourhood,
        action: station.Action,
        flaggedAt: new Date(),
        userId: session.user?.id ?? '',
      });
      setSubDone(station.BikepointID);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Subscribe failed');
    } finally {
      setLoading(false);
    }
  }

  // Screen: Overview (entry point + KPI + station table)
  if (screen === 'overview') return (
    <div className="min-h-screen text-foreground flex flex-col">
      <BackgroundGallery images={BG_IMAGES} />
      <AppHeader isDark={isDark} toggleTheme={toggleTheme} showLiveDot={stations.length > 0} isError={isError} />
      <main className="flex-1 px-600 py-500 max-w-5xl mx-auto w-full">
        {stations.length === 0 && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-800 relative overflow-hidden">
            <BikeBg />
            <div className="relative z-10 text-center max-w-md bg-background/80 backdrop-blur-sm rounded-2xl p-800">
              <h1 className="text-hero-700 font-bold leading-hero-700 text-foreground mb-200">
                Network Overview
              </h1>
              <p className="text-300 text-muted-foreground mb-600">
                Live snapshot of all 120 London Santander Cycles stations — availability, utilisation, and rebalancing queue.
              </p>
              {error && <p className="text-destructive text-300 mb-400">{error}</p>}
              <button
                onClick={startPolling}
                disabled={loading}
                className="bg-primary text-primary-foreground rounded-lg px-600 py-300 text-300 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Loading…' : 'Load Live Snapshot'}
              </button>
            </div>
          </div>
        )}

        {loading && stations.length === 0 && (
          <div className="flex items-center justify-center py-800">
            <p className="text-muted-foreground text-300 animate-pulse">Querying live data…</p>
          </div>
        )}

        {stations.length > 0 && (
          <div className="bg-background/80 dark:bg-background/85 backdrop-blur-sm rounded-2xl p-600">
            <>
            {/* KPI Cards */}
            {kpis.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-300 mb-600">
                {kpis.map(k => {
                  const label = KPI_LABELS[k.name] ?? k.name.toUpperCase();
                  const isSnapshot = label === 'LAST SNAPSHOT';
                  const isLowStock = label === 'LOW STOCK %';
                  const isUtilization = label === 'UTILIZATION %';

                  let valueClass = 'text-500 font-bold text-foreground';
                  if (isLowStock && typeof k.value === 'number') {
                    if (k.value > 0.15) valueClass = 'text-500 font-bold text-[var(--color-status-empty)]';
                    else if (k.value > 0.05) valueClass = 'text-500 font-bold text-[var(--color-status-low)]';
                  }
                  if (isUtilization && typeof k.value === 'number') {
                    if (k.value < 0.2) valueClass = 'text-500 font-bold text-[var(--color-status-empty)]';
                    else if (k.value > 0.8) valueClass = 'text-500 font-bold text-[var(--color-status-low)]';
                  }

                  const snapshotStale = lastUpdated !== null && (new Date().getTime() - lastUpdated.getTime()) > 5 * 60 * 1000;
                  const snapshotClass = isSnapshot
                    ? (lastUpdated === null || snapshotStale)
                      ? 'text-300 font-bold text-[var(--color-status-low)]'
                      : 'text-300 font-bold text-foreground'
                    : valueClass;

                  return (
                    <div key={k.name} className="bg-card border border-border rounded-xl p-400">
                      <div className="text-100 text-muted-foreground uppercase tracking-widest font-mono mb-100 truncate">
                        {label}
                      </div>
                      <div className={snapshotClass} style={{ fontFamily: 'var(--font-numeric)' }}>
                        {isSnapshot
                          ? lastUpdated
                            ? lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : '—'
                          : fmt(k.value, k.name)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center justify-between mb-400">
              <h2 className="text-400 font-semibold">{stations.length} Stations</h2>
              <div className="flex gap-300">
                <button
                  onClick={startPolling}
                  disabled={loading}
                  className="text-300 text-muted-foreground hover:text-foreground border border-border rounded-lg px-400 py-200 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Refreshing…' : '↻ Refresh'}
                </button>
                <button
                  onClick={loadRebalancing}
                  disabled={loading}
                  className="bg-primary text-primary-foreground rounded-lg px-400 py-200 text-300 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  🔃 Rebalancing Queue
                </button>
              </div>
            </div>

            {error && <p className="text-destructive text-300 mb-300">{error}</p>}

            {/* Station table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-300">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider">ID</th>
                    <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider">Street</th>
                    <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider hidden sm:table-cell">Neighbourhood</th>
                    <th className="text-right px-400 py-300 font-semibold text-200 uppercase tracking-wider">Bikes</th>
                    <th className="text-right px-400 py-300 font-semibold text-200 uppercase tracking-wider hidden md:table-cell">Docks</th>
                    <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map((s, i) => {
                    const status = getStationStatus(s.No_Bikes, s.No_Empty_Docks, s.BikesToBeFilled);
                    const cfg = statusConfig[status];
                    return (
                      <tr
                        key={s.BikepointID}
                        className={cn(
                          'border-t border-border border-l-4 transition-colors hover:bg-muted/50 cursor-pointer',
                          cfg.border,
                          i % 2 === 0 ? 'bg-card' : 'bg-background'
                        )}
                        onClick={() => { setSelected(s); setSubDone(null); setScreen('detail'); }}
                      >
                        <td className="px-400 py-300 font-mono text-200 text-muted-foreground">{s.BikepointID}</td>
                        <td className="px-400 py-300 text-foreground">{s.Street}</td>
                        <td className="px-400 py-300 text-muted-foreground hidden sm:table-cell">{s.Neighbourhood}</td>
                        <td className="px-400 py-300 text-right">
                          <div className="flex items-center justify-end gap-200">
                            <span className="w-6 text-right tabular-nums text-300 font-bold" style={{ fontFamily: 'var(--font-numeric)' }}>
                              {s.No_Bikes ?? '—'}
                            </span>
                            {typeof s.No_Bikes === 'number' && typeof s.No_Empty_Docks === 'number' && s.No_Bikes + s.No_Empty_Docks > 0 && (
                              <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full', cfg.bar)}
                                  style={{
                                    width: `${Math.round((s.No_Bikes / (s.No_Bikes + s.No_Empty_Docks)) * 100)}%`
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-400 py-300 text-right text-muted-foreground hidden md:table-cell">
                          {s.No_Empty_Docks ?? '—'}
                        </td>
                        <td className="px-400 py-300">
                          <span className={cn(
                            'px-200 py-100 rounded-full text-100 font-medium',
                            cfg.bg,
                            cfg.text
                          )}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
          </div>
        )}
      </main>
    </div>
  );

  // Screen: Station Detail
  if (screen === 'detail' && selected) {
    const detailStatus = getStationStatus(selected.No_Bikes, selected.No_Empty_Docks, selected.BikesToBeFilled);
    const detailCfg = statusConfig[detailStatus];
    return (
    <div className="min-h-screen text-foreground flex flex-col">
      <BackgroundGallery images={BG_IMAGES} />
      <AppHeader isDark={isDark} toggleTheme={toggleTheme} back={() => setScreen('overview')} backLabel="Network" />
      <main className="flex-1 px-600 py-500 max-w-2xl mx-auto w-full">
        <div className="bg-background/80 dark:bg-background/85 backdrop-blur-sm rounded-2xl p-600">
        <div className="mb-200 flex items-center gap-300">
          <span className="font-mono text-200 text-muted-foreground bg-muted px-300 py-100 rounded">
            #{selected.BikepointID}
          </span>
          <span className={cn('text-100 font-medium px-200 py-100 rounded-full', detailCfg.bg, detailCfg.text)}>
            {detailCfg.label}
          </span>
        </div>
        <h2 className="text-hero-700 font-bold leading-hero-700 mb-100">{selected.Street}</h2>
        <p className="text-300 text-muted-foreground mb-600">{selected.Neighbourhood}</p>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-300 mb-600">
          {[
            { label: 'Bikes', value: selected.No_Bikes },
            { label: 'Empty Docks', value: selected.No_Empty_Docks },
            { label: 'Bikes to Fill', value: selected.BikesToBeFilled },
            { label: 'Capacity', value: (selected.No_Bikes ?? 0) + (selected.No_Empty_Docks ?? 0) },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-400">
              <div className="text-100 text-muted-foreground uppercase tracking-widest font-mono mb-100">{s.label}</div>
              <div className="text-500 font-bold text-foreground" style={{ fontFamily: 'var(--font-numeric)' }}>
                {s.value ?? '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Location */}
        <div className="bg-card border border-border rounded-xl p-400 mb-600">
          <div className="text-100 text-muted-foreground uppercase tracking-widest font-mono mb-200">Location</div>
          <div className="font-mono text-300 text-foreground">
            {selected.Latitude?.toFixed(6)}, {selected.Longitude?.toFixed(6)}
          </div>
          {selected.Timestamp && (
            <div className="text-200 text-muted-foreground mt-100">
              Snapshot: {fmt(selected.Timestamp, 'Snapshot Time')}
            </div>
          )}
        </div>

        {error && <p className="text-destructive text-300 mb-300">{error}</p>}

        {selected.Action && selected.Action !== 'OK' && (
          subDone === selected.BikepointID ? (
            <div className="bg-muted rounded-lg px-400 py-300 text-300 text-foreground font-medium">
              ✅ Alert saved — station #{selected.BikepointID} ({selected.Action})
            </div>
          ) : (
            <button
              onClick={() => handleSubscribe(selected)}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-lg px-600 py-300 text-300 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Saving…' : `🔔 Flag for Rebalancing — ${selected.Action}`}
            </button>
          )
        )}
        </div>
      </main>
    </div>
  );
  }

  // Screen: Rebalancing Queue
  return (
    <div className="min-h-screen text-foreground flex flex-col">
      <BackgroundGallery images={BG_IMAGES} />
      <AppHeader isDark={isDark} toggleTheme={toggleTheme} back={() => setScreen('overview')} backLabel="Network" />
      <main className="flex-1 px-600 py-500 max-w-4xl mx-auto w-full">
        <div className="bg-background/80 dark:bg-background/85 backdrop-blur-sm rounded-2xl p-600">
        <h2 className="text-hero-700 font-bold leading-hero-700 mb-100">Rebalancing Queue</h2>
        <p className="text-200 text-muted-foreground mb-500 uppercase tracking-widest font-mono">
          {rebalanceStations.length} stations needing action
        </p>

        {error && <p className="text-destructive text-300 mb-300">{error}</p>}

        {rebalanceStations.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-800 text-center">
            <p className="text-muted-foreground text-300">No stations require rebalancing right now.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-300">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider">ID</th>
                  <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider">Street</th>
                  <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider hidden sm:table-cell">Area</th>
                  <th className="text-right px-400 py-300 font-semibold text-200 uppercase tracking-wider">Bikes</th>
                  <th className="text-right px-400 py-300 font-semibold text-200 uppercase tracking-wider">To Move</th>
                  <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider">Action</th>
                  <th className="px-400 py-300"></th>
                </tr>
              </thead>
              <tbody>
                {rebalanceStations.map((s, i) => {
                  const rStatus = getStationStatus(s.No_Bikes, s.No_Empty_Docks, s.BikesToBeFilled);
                  const rCfg = statusConfig[rStatus];
                  return (
                  <tr
                    key={s.BikepointID}
                    className={cn(
                      'border-t border-border border-l-4',
                      rCfg.border,
                      i % 2 === 0 ? 'bg-card' : 'bg-background'
                    )}
                  >
                    <td className="px-400 py-300 font-mono text-200 text-muted-foreground">{s.BikepointID}</td>
                    <td
                      className="px-400 py-300 text-foreground cursor-pointer hover:underline"
                      onClick={() => { setSelected(s); setSubDone(null); setScreen('detail'); }}
                    >
                      {s.Street}
                    </td>
                    <td className="px-400 py-300 text-muted-foreground hidden sm:table-cell">{s.Neighbourhood}</td>
                    <td className="px-400 py-300 text-right font-bold" style={{ fontFamily: 'var(--font-numeric)' }}>
                      {s.No_Bikes ?? '—'}
                    </td>
                    <td className="px-400 py-300 text-right font-bold text-primary" style={{ fontFamily: 'var(--font-numeric)' }}>
                      {s.BikesToBeFilled ?? '—'}
                    </td>
                    <td className="px-400 py-300">
                      <span className={cn('px-200 py-100 rounded-full text-100 font-medium', rCfg.bg, rCfg.text)}>
                        {rCfg.label}
                      </span>
                    </td>
                    <td className="px-400 py-300 text-right">
                      {subDone === s.BikepointID ? (
                        <span className="text-200 text-muted-foreground">✅ Flagged</span>
                      ) : (
                        <button
                          onClick={() => handleSubscribe(s)}
                          disabled={loading}
                          className="text-200 text-primary hover:underline disabled:opacity-50"
                        >
                          Flag
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
