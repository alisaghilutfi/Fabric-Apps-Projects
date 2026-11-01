import { useState, useRef } from 'react';
import { Activity, TrendingUp, BarChart2, Zap, AlertTriangle } from 'lucide-react';
import { getRayfinClient } from './lib/rayfin-client';
import { useAppTheme } from './hooks/use-theme';
import { cn } from './lib/utils';
import { EarthquakeMap, type EarthquakePoint } from './components/EarthquakeMap';

type Screen = 'search' | 'results' | 'subscribe';

interface EarthquakeRow {
  ID: string;
  Title: string;
  'Place Description': string;
  Magnitude: number;
  'Significance Class': string;
  'Event Time': string;
  'Country Code': string;
  Latitude: number;
  Longitude: number;
}

interface KpiRow { name: string; value: string | number; }

const COUNTRIES: { code: string; name: string }[] = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' }, { code: 'AR', name: 'Argentina' },
  { code: 'AU', name: 'Australia' }, { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' }, { code: 'BD', name: 'Bangladesh' },
  { code: 'BO', name: 'Bolivia' }, { code: 'BR', name: 'Brazil' },
  { code: 'BG', name: 'Bulgaria' }, { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' }, { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' }, { code: 'HR', name: 'Croatia' },
  { code: 'CZ', name: 'Czech Republic' }, { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' }, { code: 'SV', name: 'El Salvador' },
  { code: 'FI', name: 'Finland' }, { code: 'FR', name: 'France' },
  { code: 'GE', name: 'Georgia' }, { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' }, { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' }, { code: 'HU', name: 'Hungary' },
  { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' },
  { code: 'IL', name: 'Israel' }, { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' }, { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' }, { code: 'KE', name: 'Kenya' },
  { code: 'KG', name: 'Kyrgyzstan' }, { code: 'MX', name: 'Mexico' },
  { code: 'MA', name: 'Morocco' }, { code: 'MM', name: 'Myanmar' },
  { code: 'NP', name: 'Nepal' }, { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' }, { code: 'NO', name: 'Norway' },
  { code: 'PK', name: 'Pakistan' }, { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' }, { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' }, { code: 'PT', name: 'Portugal' },
  { code: 'PR', name: 'Puerto Rico' }, { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' }, { code: 'SA', name: 'Saudi Arabia' },
  { code: 'RS', name: 'Serbia' }, { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' }, { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' }, { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' }, { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' }, { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' }, { code: 'TH', name: 'Thailand' },
  { code: 'TR', name: 'Turkey' }, { code: 'TM', name: 'Turkmenistan' },
  { code: 'UG', name: 'Uganda' }, { code: 'UA', name: 'Ukraine' },
  { code: 'US', name: 'United States' }, { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
];

function formatKpi(name: string, value: string | number): string {
  const label = name.replace(/^\[|\]$/g, '').trim();
  if (value === null || value === undefined) return '—';
  if (typeof value !== 'number') return String(value);
  if (label.includes('%')) return (value * 100).toFixed(1) + '%';
  if (label.toLowerCase().includes('magnitude')) return value.toFixed(2);
  return value.toLocaleString();
}

function sigBadge(cls: string) {
  if (cls === 'High') return 'bg-destructive text-destructive-foreground';
  if (cls === 'Moderate') return 'bg-accent text-accent-foreground';
  return 'bg-muted text-muted-foreground';
}

const KPI_META: Record<string, { icon: React.ReactNode; accent: string }> = {
  'Total Earthquakes': { icon: <Activity size={16} />,      accent: '#6366f1' },
  'Avg Magnitude':     { icon: <BarChart2 size={16} />,     accent: '#2563eb' },
  'Max Magnitude':     { icon: <TrendingUp size={16} />,    accent: '#dc2626' },
  'Max Significance':  { icon: <Zap size={16} />,           accent: '#d97706' },
  '% High Significance': { icon: <AlertTriangle size={16} />, accent: '#7c3aed' },
};

function KpiCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="px-400 pt-300 pb-400">
        <div className="flex items-center gap-150 mb-100">
          <span style={{ color: accent }}>{icon}</span>
          <span className="text-100 text-muted-foreground uppercase tracking-widest font-mono truncate">
            {label}
          </span>
        </div>
        <div className="text-500 font-bold text-foreground" style={{ fontFamily: 'var(--font-numeric)' }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function SeismographAnimBg() {
  const makeTrace = (seed: number, offsetY: number, big: boolean) =>
    Array.from({ length: 160 }, (_, i) => {
      const x = (i / 159) * 800;
      const quake = big && i > 70 && i < 100
        ? Math.sin((i - 70) * 0.55) * 32 * Math.exp(-0.04 * (i - 70))
        : 0;
      const noise =
        Math.sin(i * 0.35 + seed) * 5 +
        Math.sin(i * 0.9 + seed * 2) * 2.5 +
        Math.sin(i * 2.1 + seed) * 1 +
        quake;
      return `${x.toFixed(1)},${(offsetY + noise).toFixed(1)}`;
    }).join(' ');

  const traces = [
    { y: 50,  big: false, seed: 1.1, opacity: 0.55, delay: '0s'    },
    { y: 110, big: true,  seed: 2.7, opacity: 0.9,  delay: '-1.5s' },
    { y: 170, big: false, seed: 0.4, opacity: 0.45, delay: '-3s'   },
  ];

  return (
    <>
      {/* Dark overlay so the form is always readable */}
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
      <svg
        viewBox="0 0 800 220"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
        style={{ background: 'linear-gradient(135deg,#0a1628 0%,#0f2540 50%,#0a1628 100%)' }}
      >
        <style>{`
          @keyframes seis-scroll {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
        `}</style>
        {traces.map((t, idx) => (
          <g key={idx} style={{
            animation: `seis-scroll 8s linear infinite`,
            animationDelay: t.delay,
          }}>
            <polyline
              points={[makeTrace(t.seed, t.y, t.big), makeTrace(t.seed + 0.1, t.y, t.big)].join(' 800,')}
              fill="none"
              stroke="#22d3ee"
              strokeWidth={t.big ? '1.4' : '0.9'}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={t.opacity}
            />
          </g>
        ))}
      </svg>
    </>
  );
}

export default function App() {
  const { isDark, toggleTheme } = useAppTheme();
  const [screen, setScreen] = useState<Screen>('search');
  const [search, setSearch] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [kpis, setKpis] = useState<KpiRow[]>([]);
  const [earthquakes, setEarthquakes] = useState<EarthquakeRow[]>([]);
  const [minMag, setMinMag] = useState(4.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subDone, setSubDone] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const mapPoints: EarthquakePoint[] = earthquakes
    .filter(eq => eq.Latitude != null && eq.Longitude != null)
    .map(eq => ({
      id:       String(eq.ID ?? `${eq['Event Time']}-${eq.Magnitude}`),
      lat:      Number(eq.Latitude),
      lng:      Number(eq.Longitude),
      magnitude: Number(eq.Magnitude ?? 0),
      place:    String(eq['Place Description'] ?? ''),
      time:     String(eq['Event Time'] ?? ''),
      sigClass: String(eq['Significance Class'] ?? ''),
    }));

  function handleMapSelect(id: string) {
    setHighlightId(id);
    // Scroll the highlighted row into view
    const row = tableRef.current?.querySelector(`[data-eq-id="${id}"]`);
    if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSearch(code: string, name: string) {
    setError('');
    setLoading(true);
    setShowDropdown(false);
    try {
      const client = await getRayfinClient();
      const cc = code.toUpperCase().trim();

      const kpiResult = await client.connectors.sm_usgs_earthquake.executeQuery({
        query: `EVALUATE ROW("Total Earthquakes", CALCULATE([Total Earthquakes], 'Earthquake Events'[Country Code] = "${cc}"), "Avg Magnitude", CALCULATE([Avg Magnitude], 'Earthquake Events'[Country Code] = "${cc}"), "Max Magnitude", CALCULATE([Max Magnitude], 'Earthquake Events'[Country Code] = "${cc}"), "Max Significance", CALCULATE([Max Significance], 'Earthquake Events'[Country Code] = "${cc}"), "% High Significance", CALCULATE([% High Significance], 'Earthquake Events'[Country Code] = "${cc}"))`,
      });
      const kpiRows: KpiRow[] =
        kpiResult.status === 'success' && kpiResult.table.rows.length > 0
          ? kpiResult.table.columns.map((col, i) => ({
              name: col.name,
              value: kpiResult.table.rows[0][i] as string | number,
            }))
          : [];

      const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const listResult = await client.connectors.sm_usgs_earthquake.executeQuery({
        query: `EVALUATE TOPN(50, FILTER('Earthquake Events', 'Earthquake Events'[Country Code] = "${cc}" && 'Earthquake Events'[Event Time] >= DATE(${d.getFullYear()}, ${d.getMonth() + 1}, ${d.getDate()})), 'Earthquake Events'[Event Time], DESC)`,
      });
      const eqRows: EarthquakeRow[] =
        listResult.status === 'success'
          ? listResult.table.rows.map(row => {
              const cols = listResult.table.columns.map(c =>
                c.name.includes('[') ? c.name.split('[')[1].replace(']', '') : c.name
              );
              const obj: Record<string, unknown> = {};
              cols.forEach((col, i) => { obj[col] = row[i]; });
              return obj as unknown as EarthquakeRow;
            })
          : [];

      setCountryCode(cc);
      setCountryName(name);
      setKpis(kpiRows);
      setEarthquakes(eqRows);
      setScreen('results');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe() {
    setLoading(true);
    try {
      const client = await getRayfinClient();
      const session = client.auth.getSession();
      await client.data.Subscription.create({
        countryCode,
        minMagnitude: minMag,
        createdAt: new Date(),
        userId: session.user?.id ?? '',
      });
      setSubDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Subscribe failed');
    } finally {
      setLoading(false);
    }
  }

  // Header — shared across screens
  const Header = ({ back, backLabel }: { back?: () => void; backLabel?: string }) => (
    <header className="flex items-center justify-between px-600 py-300 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
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
          🌍 Earthquake Alert
        </span>
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

  // Screen: Search
  if (screen === 'search') return (
    <div className="min-h-screen text-foreground flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-400 py-800 relative overflow-hidden">
        <SeismographAnimBg />
        <div className="relative z-10 w-full max-w-md">
          <h1 className="text-hero-700 font-bold leading-hero-700 text-white mb-200">
            Recent Seismic Activity
          </h1>
          <p className="text-300 text-white/70 mb-600 leading-300">
            Search by country to explore earthquake data and subscribe to alerts.
          </p>

          <div className="relative mb-400">
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search country — e.g. Japan, US, Turkey…"
              className="w-full bg-card border border-input rounded-lg px-400 py-300 text-300 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
            {showDropdown && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-100 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-20 max-h-64 overflow-y-auto">
                {filtered.map(c => (
                  <button
                    key={c.code}
                    onClick={() => { setSearch(c.name); handleSearch(c.code, c.name); }}
                    className="w-full text-left px-400 py-200 text-300 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between"
                  >
                    <span>{c.name}</span>
                    <span className="font-mono text-200 text-muted-foreground">{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-300 text-300 mb-300">{error}</p>
          )}

          <button
            onClick={() => {
              const match = COUNTRIES.find(c =>
                c.code === search.toUpperCase() || c.name.toLowerCase() === search.toLowerCase()
              );
              if (match) handleSearch(match.code, match.name);
              else if (search.length === 2) handleSearch(search, search);
              else setError('Select a country from the list');
            }}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-lg px-400 py-300 text-300 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </main>
    </div>
  );

  // Screen: Results
  if (screen === 'results') return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header back={() => setScreen('search')} backLabel="Search" />
      <main className="flex-1 px-600 py-500 max-w-4xl mx-auto w-full">
        <h2 className="text-hero-700 font-bold leading-hero-700 mb-100">
          {countryName || countryCode}
        </h2>
        <p className="text-200 text-muted-foreground mb-500 uppercase tracking-widest font-mono">
          Last 30 days · {earthquakes.length} of {earthquakes.length === 50 ? '50+' : earthquakes.length} events shown
        </p>

        {/* KPI Cards */}
        {kpis.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-300 mb-600">
            {kpis.map(k => {
              const label = k.name.replace(/^\[|\]$/g, '').trim();
              const meta = KPI_META[label] ?? { icon: <Activity size={16} />, accent: '#6366f1' };
              return (
                <KpiCard
                  key={k.name}
                  label={label}
                  value={formatKpi(k.name, k.value)}
                  accent={meta.accent}
                  icon={meta.icon}
                />
              );
            })}
          </div>
        )}

        {/* Split layout: table + map */}
        {earthquakes.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-800 text-center mb-600">
            <p className="text-muted-foreground text-300">No earthquakes recorded in the last 30 days for {countryName || countryCode}.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-400 mb-600">
            {/* Table — top half, scrollable */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-y-auto" style={{ maxHeight: '300px' }} ref={tableRef}>
                <table className="w-full text-300">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-primary text-primary-foreground">
                      <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider">Time</th>
                      <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider">Location</th>
                      <th className="text-right px-400 py-300 font-semibold text-200 uppercase tracking-wider">Mag</th>
                      <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider hidden sm:table-cell">Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earthquakes.map((eq, i) => {
                      const eqId = String(eq.ID ?? `${eq['Event Time']}-${eq.Magnitude}`);
                      const isHighlighted = eqId === highlightId;
                      return (
                        <tr
                          key={eqId}
                          data-eq-id={eqId}
                          onClick={() => setHighlightId(eqId)}
                          className={cn(
                            'border-t border-border transition-colors cursor-pointer',
                            isHighlighted
                              ? 'bg-primary/15 border-l-4 border-l-primary'
                              : i % 2 === 0 ? 'bg-card hover:bg-muted/50' : 'bg-background hover:bg-muted/50'
                          )}
                        >
                          <td className="px-400 py-300 text-muted-foreground font-mono text-200 whitespace-nowrap">
                            {eq['Event Time'] ? new Date(String(eq['Event Time'])).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-400 py-300 text-foreground">{eq['Place Description'] ?? '—'}</td>
                          <td className="px-400 py-300 text-right font-bold text-primary" style={{ fontFamily: 'var(--font-numeric)' }}>
                            {eq.Magnitude != null ? Number(eq.Magnitude).toFixed(1) : '—'}
                          </td>
                          <td className="px-400 py-300 hidden sm:table-cell">
                            <span className={cn('text-100 font-semibold px-300 py-100 rounded-full uppercase tracking-widest', sigBadge(eq['Significance Class']))}>
                              {eq['Significance Class'] ?? '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Map — bottom half */}
            <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ height: '340px' }}>
              <EarthquakeMap
                points={mapPoints}
                isDark={isDark}
                highlightId={highlightId}
                onSelectId={handleMapSelect}
              />
            </div>
          </div>
        )}

        <button
          onClick={() => { setSubDone(false); setScreen('subscribe'); }}
          className="bg-primary text-primary-foreground rounded-lg px-600 py-300 text-300 font-semibold hover:opacity-90 transition-opacity"
        >
          🔔 Subscribe — {countryName || countryCode}
        </button>
      </main>
    </div>
  );

  // Screen: Subscribe
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header back={() => setScreen('results')} backLabel="Results" />
      <main className="flex-1 flex flex-col items-center justify-center px-400">
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-600">
          <h2 className="text-500 font-bold mb-200">Subscribe to Alerts</h2>
          <p className="text-300 text-muted-foreground mb-500">
            Get notified about earthquakes in <strong className="text-foreground">{countryName || countryCode}</strong> above your chosen magnitude.
          </p>

          <label className="block mb-200 text-300 font-semibold">
            Minimum magnitude
            <span className="ml-200 font-mono text-accent font-bold">{minMag.toFixed(1)}</span>
          </label>
          <input
            type="range" min={1} max={9} step={0.1}
            value={minMag}
            onChange={e => setMinMag(parseFloat(e.target.value))}
            className="w-full mb-500 accent-primary"
          />

          {error && <p className="text-destructive text-300 mb-300">{error}</p>}

          {subDone ? (
            <div className="bg-muted rounded-lg px-400 py-300 text-300 text-foreground font-medium">
              ✅ Subscribed — alerts set for <strong>{countryName || countryCode}</strong> M ≥ {minMag.toFixed(1)}
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-lg px-400 py-300 text-300 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Confirm Subscription'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
