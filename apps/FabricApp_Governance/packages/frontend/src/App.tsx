import { useState, useCallback } from 'react';
import { getRayfinClient } from './lib/rayfin-client';
import { useAppTheme } from './hooks/use-theme';
import { cn } from './lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RuleFrequency {
  ruleId: string;
  severity: string;
  count: number;
}

interface WorkspaceHealth {
  workspaceId: string;
  name: string;
  score: number;
  criticalCount: number;
  mediumCount: number;
  lowCount: number;
  adminCount: number;
  state: string;
  gitConnected: boolean;
}

interface ViolationRecord {
  workspaceId: string;
  ruleId: string;
  workspaceName: string;
  severity: string;
  detail: string;
  passed: boolean;
}

interface WorkspaceItem {
  itemId: string;
  workspaceId: string;
  name: string;
  type: string;
  lastActivityDate: string;
}

interface KpiSummary {
  totalWorkspaces: number;
  avgHealthScore: number;
  criticalViolations: number;
  singleAdminWorkspaces: number;
}

type Screen = 'overview' | 'detail' | 'violations';
type ViolationSeverityFilter = 'All' | 'High' | 'Medium' | 'Low';
type DetailTab = 'violations' | 'items';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return '#107c10';
  if (score >= 60) return '#d97706';
  return '#c50f1f';
}

function severityOrder(s: string): number {
  if (s === 'High') return 0;
  if (s === 'Medium') return 1;
  return 2;
}

function parseBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  return false;
}

function extractCols(columns: Array<{ name: string }>): string[] {
  return columns.map(c =>
    c.name.includes('[') ? c.name.split('[')[1].replace(']', '') : c.name
  );
}

function rowsToObjects(columns: Array<{ name: string }>, rows: unknown[][]): Record<string, unknown>[] {
  const cols = extractCols(columns);
  return rows.map(row => {
    const obj: Record<string, unknown> = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function exportToCsv(rows: ViolationRecord[], filename: string) {
  const header = 'workspaceName,severity,ruleId,detail';
  const lines = rows.map(r =>
    [r.workspaceName, r.severity, r.ruleId, `"${(r.detail ?? '').replace(/"/g, '""')}"`].join(',')
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Shared Components ────────────────────────────────────────────────────────

function AppHeader({
  isDark,
  toggleTheme,
  back,
  backLabel,
  title,
}: {
  isDark: boolean;
  toggleTheme: () => void;
  back?: () => void;
  backLabel?: string;
  title?: string;
}) {
  return (
    <header className="flex items-center justify-between px-600 py-300 border-b border-border bg-background sticky top-0 z-10">
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
          {title ?? '🛡 Fabric Governance Health'}
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
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="px-400 pt-300 pb-400">
        <div className="text-100 text-muted-foreground uppercase tracking-widest font-mono mb-100 truncate">
          {label}
        </div>
        <div
          className="text-500 font-bold text-foreground"
          style={{ fontFamily: 'var(--font-numeric)' }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === 'High'
      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      : severity === 'Medium'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  return (
    <span className={cn('px-200 py-100 rounded-full text-100 font-medium', cls)}>
      {severity}
    </span>
  );
}

function LoadingRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-400 py-500 text-center text-muted-foreground text-300 animate-pulse">
        Loading…
      </td>
    </tr>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-400 py-500 text-center text-muted-foreground text-300">
        {message}
      </td>
    </tr>
  );
}

// ─── Shared Chart Components ─────────────────────────────────────────────────

function ScoreHistogram({ workspaces }: { workspaces: WorkspaceHealth[] }) {
  const bands = ['0–19', '20–39', '40–59', '60–79', '80–100'];
  const bandCounts = [0, 0, 0, 0, 0];
  workspaces.forEach(w => {
    const s = w.score ?? 0;
    if (s < 20) bandCounts[0]++;
    else if (s < 40) bandCounts[1]++;
    else if (s < 60) bandCounts[2]++;
    else if (s < 80) bandCounts[3]++;
    else bandCounts[4]++;
  });
  const bandColors = ['#c50f1f', '#c50f1f', '#d97706', '#d97706', '#107c10'];
  const maxCount = Math.max(...bandCounts, 1);

  return (
    <div className="bg-card border border-border rounded-xl p-500 mb-500">
      <div className="text-100 text-muted-foreground uppercase tracking-widest font-mono mb-300">
        Score Distribution
      </div>
      <div className="space-y-200">
        {bands.map((band, i) => (
          <div key={band} className="flex items-center gap-300">
            <div
              className="text-200 text-muted-foreground font-mono text-right"
              style={{ minWidth: '52px' }}
            >
              {band}
            </div>
            <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(bandCounts[i] / maxCount) * 100}%`,
                  backgroundColor: bandColors[i],
                }}
              />
            </div>
            <div
              className="text-200 font-bold w-6 text-right tabular-nums"
              style={{ color: bandColors[i], fontFamily: 'var(--font-numeric)' }}
            >
              {bandCounts[i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuleFrequencyChart({ rules }: { rules: RuleFrequency[] }) {
  const maxCount = Math.max(...rules.map(r => r.count), 1);

  function ruleBarColor(severity: string): string {
    if (severity === 'High') return '#c50f1f';
    if (severity === 'Medium') return '#d97706';
    return '#616161';
  }

  return (
    <div className="bg-card border border-border rounded-xl p-500 mb-500">
      <div className="text-100 text-muted-foreground uppercase tracking-widest font-mono mb-300">
        Top Violations by Rule
      </div>
      {rules.length === 0 ? (
        <p className="text-muted-foreground text-300">No rule data available.</p>
      ) : (
        <div className="space-y-200">
          {rules.map(r => (
            <div key={r.ruleId} className="flex items-center gap-300">
              <div
                className="text-200 text-muted-foreground font-mono truncate text-right"
                style={{ minWidth: '200px', maxWidth: '240px' }}
                title={r.ruleId}
              >
                {r.ruleId}
              </div>
              <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(r.count / maxCount) * 100}%`,
                    backgroundColor: ruleBarColor(r.severity),
                  }}
                />
              </div>
              <div
                className="text-200 font-bold w-10 text-right tabular-nums"
                style={{ color: ruleBarColor(r.severity), fontFamily: 'var(--font-numeric)' }}
              >
                {r.count}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Screen 1: Tenant Health Overview ────────────────────────────────────────

function OverviewScreen({
  isDark,
  toggleTheme,
  onSelectWorkspace,
  onNavigateViolations,
}: {
  isDark: boolean;
  toggleTheme: () => void;
  onSelectWorkspace: (ws: WorkspaceHealth) => void;
  onNavigateViolations: () => void;
}) {
  const [workspaces, setWorkspaces] = useState<WorkspaceHealth[]>([]);
  const [kpis, setKpis] = useState<KpiSummary | null>(null);
  const [ruleFrequency, setRuleFrequency] = useState<RuleFrequency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const client = await getRayfinClient();

      const kpiResult = await client.connectors.sm_governance.executeQuery({
        query: `EVALUATE ROW(
          "Total Workspaces", [Total Workspaces],
          "Avg Health Score", [Avg Health Score],
          "Critical Violations", [Critical Violations],
          "Single Admin Workspaces", [Single Admin Workspaces]
        )`,
      });

      if (kpiResult.status === 'success' && kpiResult.table.rows.length > 0) {
        const cols = extractCols(kpiResult.table.columns);
        const row = kpiResult.table.rows[0];
        const get = (name: string) => {
          const i = cols.findIndex(c => c === name);
          return i >= 0 ? row[i] : null;
        };
        setKpis({
          totalWorkspaces: Number(get('Total Workspaces') ?? 0),
          avgHealthScore: Number(get('Avg Health Score') ?? 0),
          criticalViolations: Number(get('Critical Violations') ?? 0),
          singleAdminWorkspaces: Number(get('Single Admin Workspaces') ?? 0),
        });
      }

      const wsResult = await client.connectors.sm_governance.executeQuery({
        query: `EVALUATE SELECTCOLUMNS(
          gold_health_scores,
          "workspaceId", gold_health_scores[workspace_id],
          "name", RELATED(gold_workspaces[name]),
          "score", gold_health_scores[score],
          "criticalCount", gold_health_scores[critical_count],
          "mediumCount", gold_health_scores[medium_count],
          "lowCount", gold_health_scores[low_count],
          "adminCount", RELATED(gold_workspaces[admin_count]),
          "state", RELATED(gold_workspaces[state]),
          "gitConnected", RELATED(gold_workspaces[git_connected])
        )`,
      });

      if (wsResult.status === 'success') {
        const objs = rowsToObjects(wsResult.table.columns, wsResult.table.rows as unknown[][]);
        const rows: WorkspaceHealth[] = objs.map(o => ({
          workspaceId: String(o['workspaceId'] ?? ''),
          name: String(o['name'] ?? ''),
          score: Number(o['score'] ?? 0),
          criticalCount: Number(o['criticalCount'] ?? 0),
          mediumCount: Number(o['mediumCount'] ?? 0),
          lowCount: Number(o['lowCount'] ?? 0),
          adminCount: Number(o['adminCount'] ?? 0),
          state: String(o['state'] ?? ''),
          gitConnected: parseBool(o['gitConnected']),
        }));
        rows.sort((a, b) => a.score - b.score);
        setWorkspaces(rows);
      } else if (wsResult.status === 'error') {
        setError(wsResult.error.message);
      }

      const ruleResult = await client.connectors.sm_governance.executeQuery({
        query: `EVALUATE
SUMMARIZECOLUMNS(
    gold_health_rule_results[rule_id],
    gold_health_rule_results[severity],
    "ViolationCount", COUNTROWS(gold_health_rule_results)
)
ORDER BY [ViolationCount] DESC`,
      });

      if (ruleResult.status === 'success') {
        const objs = rowsToObjects(ruleResult.table.columns, ruleResult.table.rows as unknown[][]);
        const rows: RuleFrequency[] = objs.map(o => ({
          ruleId: String(o['rule_id'] ?? ''),
          severity: String(o['severity'] ?? 'Low'),
          count: Number(o['ViolationCount'] ?? 0),
        }));
        setRuleFrequency(rows.slice(0, 10));
      }

      setLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const maxScore = workspaces.length > 0 ? Math.max(...workspaces.map(w => w.score)) : 100;

  return (
    <div className="min-h-screen text-foreground flex flex-col">
      <AppHeader isDark={isDark} toggleTheme={toggleTheme} />
      <main className="flex-1 px-600 py-500 max-w-6xl mx-auto w-full">

        {!loaded && !loading && (
          <div className="flex flex-col items-center justify-center py-800 text-center">
            <h1 className="text-hero-700 font-bold leading-hero-700 text-foreground mb-200">
              Tenant Health Overview
            </h1>
            <p className="text-300 text-muted-foreground mb-600 max-w-md">
              Governance health scores, violation counts, and workspace inventory across the Fabric tenant.
            </p>
            {error && <p className="text-destructive text-300 mb-400">{error}</p>}
            <button
              onClick={load}
              className="bg-primary text-primary-foreground rounded-lg px-600 py-300 text-300 font-semibold hover:opacity-90 transition-opacity"
            >
              Load Governance Data
            </button>
          </div>
        )}

        {loading && !loaded && (
          <div className="flex items-center justify-center py-800">
            <p className="text-muted-foreground text-300 animate-pulse">Querying sm_Governance…</p>
          </div>
        )}

        {loaded && (
          <>
            {/* KPI row */}
            {kpis && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-300 mb-500">
                <KpiCard label="Total Workspaces" value={kpis.totalWorkspaces} accent="#6366f1" />
                <KpiCard
                  label="Avg Health Score"
                  value={kpis.avgHealthScore.toFixed(1)}
                  accent={scoreColor(kpis.avgHealthScore)}
                />
                <KpiCard label="Critical Violations" value={kpis.criticalViolations} accent="#c50f1f" />
                <KpiCard label="Single Admin WS" value={kpis.singleAdminWorkspaces} accent="#d97706" />
              </div>
            )}

            {/* Nav */}
            <div className="flex items-center justify-between mb-400">
              <h2 className="text-400 font-semibold">{workspaces.length} Workspaces</h2>
              <div className="flex gap-300">
                <button
                  onClick={load}
                  disabled={loading}
                  className="text-300 text-muted-foreground hover:text-foreground border border-border rounded-lg px-400 py-200 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Refreshing…' : '↻ Refresh'}
                </button>
                <button
                  onClick={onNavigateViolations}
                  className="bg-primary text-primary-foreground rounded-lg px-400 py-200 text-300 font-semibold hover:opacity-90 transition-opacity"
                >
                  Violations Explorer →
                </button>
              </div>
            </div>

            {error && <p className="text-destructive text-300 mb-300">{error}</p>}

            {/* Bar chart */}
            <div className="bg-card border border-border rounded-xl p-500 mb-500">
              <div className="text-100 text-muted-foreground uppercase tracking-widest font-mono mb-300">
                Health Score by Workspace (worst first)
              </div>
              <div className="space-y-200 overflow-y-auto" style={{ maxHeight: '280px' }}>
                {workspaces.map(ws => (
                  <div key={ws.workspaceId} className="flex items-center gap-300">
                    <div
                      className="text-200 text-muted-foreground truncate"
                      style={{ minWidth: '160px', maxWidth: '200px' }}
                      title={ws.name}
                    >
                      {ws.name}
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${maxScore > 0 ? (ws.score / maxScore) * 100 : 0}%`,
                          backgroundColor: scoreColor(ws.score),
                        }}
                      />
                    </div>
                    <div
                      className="text-200 font-bold w-10 text-right tabular-nums"
                      style={{ color: scoreColor(ws.score), fontFamily: 'var(--font-numeric)' }}
                    >
                      {ws.score.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Score histogram */}
            <ScoreHistogram workspaces={workspaces} />

            {/* Rule frequency chart */}
            <RuleFrequencyChart rules={ruleFrequency} />

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
                <table className="w-full text-300">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-primary text-primary-foreground">
                      <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider">Workspace</th>
                      <th className="text-right px-400 py-300 font-semibold text-200 uppercase tracking-wider">Score</th>
                      <th className="text-right px-400 py-300 font-semibold text-200 uppercase tracking-wider hidden sm:table-cell">Critical</th>
                      <th className="text-right px-400 py-300 font-semibold text-200 uppercase tracking-wider hidden md:table-cell">Admins</th>
                      <th className="text-center px-400 py-300 font-semibold text-200 uppercase tracking-wider hidden lg:table-cell">Git</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspaces.length === 0 && (
                      <EmptyRow cols={5} message="No workspace data returned." />
                    )}
                    {workspaces.map((ws, i) => (
                      <tr
                        key={ws.workspaceId}
                        className={cn(
                          'border-t border-border border-l-4 cursor-pointer transition-colors hover:bg-muted/50',
                          i % 2 === 0 ? 'bg-card' : 'bg-background'
                        )}
                        style={{ borderLeftColor: scoreColor(ws.score) }}
                        onClick={() => onSelectWorkspace(ws)}
                      >
                        <td className="px-400 py-300 text-foreground font-medium">{ws.name}</td>
                        <td className="px-400 py-300 text-right">
                          <span
                            className="font-bold tabular-nums"
                            style={{ color: scoreColor(ws.score), fontFamily: 'var(--font-numeric)' }}
                          >
                            {ws.score.toFixed(0)}
                          </span>
                        </td>
                        <td className="px-400 py-300 text-right hidden sm:table-cell">
                          {ws.criticalCount > 0 ? (
                            <span className="text-red-600 font-semibold">{ws.criticalCount}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="px-400 py-300 text-right text-muted-foreground hidden md:table-cell">{ws.adminCount}</td>
                        <td className="px-400 py-300 text-center hidden lg:table-cell">
                          {ws.gitConnected ? (
                            <span className="text-green-600 text-200">✓</span>
                          ) : (
                            <span className="text-muted-foreground text-200">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Screen 2: Workspace Detail ───────────────────────────────────────────────

function DetailScreen({
  workspace,
  isDark,
  toggleTheme,
  onBack,
}: {
  workspace: WorkspaceHealth;
  isDark: boolean;
  toggleTheme: () => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>('violations');
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const client = await getRayfinClient();

      const violResult = await client.connectors.sm_governance.executeQuery({
        query: `EVALUATE FILTER(
          SELECTCOLUMNS(
            gold_health_rule_results,
            "workspaceId", gold_health_rule_results[workspace_id],
            "ruleId", gold_health_rule_results[rule_id],
            "workspaceName", RELATED(gold_workspaces[name]),
            "severity", gold_health_rule_results[severity],
            "detail", gold_health_rule_results[detail],
            "passed", gold_health_rule_results[passed]
          ),
          [workspaceId] = "${workspace.workspaceId}"
        )`,
      });

      if (violResult.status === 'success') {
        const objs = rowsToObjects(violResult.table.columns, violResult.table.rows as unknown[][]);
        const rows: ViolationRecord[] = objs.map(o => ({
          workspaceId: String(o['workspaceId'] ?? ''),
          ruleId: String(o['ruleId'] ?? ''),
          workspaceName: String(o['workspaceName'] ?? ''),
          severity: String(o['severity'] ?? 'Low'),
          detail: String(o['detail'] ?? ''),
          passed: parseBool(o['passed']),
        }));
        rows.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
        setViolations(rows);
      } else if (violResult.status === 'error') {
        setError(violResult.error.message);
      }

      const itemResult = await client.connectors.sm_governance.executeQuery({
        query: `EVALUATE FILTER(
          SELECTCOLUMNS(
            gold_items,
            "itemId", gold_items[item_id],
            "workspaceId", gold_items[workspace_id],
            "name", gold_items[name],
            "type", gold_items[type],
            "lastActivityDate", gold_items[last_activity_date]
          ),
          [workspaceId] = "${workspace.workspaceId}"
        )`,
      });

      if (itemResult.status === 'success') {
        const objs = rowsToObjects(itemResult.table.columns, itemResult.table.rows as unknown[][]);
        const rows: WorkspaceItem[] = objs.map(o => ({
          itemId: String(o['itemId'] ?? ''),
          workspaceId: String(o['workspaceId'] ?? ''),
          name: String(o['name'] ?? ''),
          type: String(o['type'] ?? ''),
          lastActivityDate: String(o['lastActivityDate'] ?? ''),
        }));
        setItems(rows);
      }

      setLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  }, [workspace.workspaceId]);

  if (!loaded && !loading) {
    void load();
  }

  return (
    <div className="min-h-screen text-foreground flex flex-col">
      <AppHeader isDark={isDark} toggleTheme={toggleTheme} back={onBack} backLabel="Overview" />
      <main className="flex-1 px-600 py-500 max-w-4xl mx-auto w-full">

        {/* Header card */}
        <div className="bg-card border border-border rounded-xl p-600 mb-500"
          style={{ borderTop: `4px solid ${scoreColor(workspace.score)}` }}>
          <div className="flex flex-wrap items-start justify-between gap-300">
            <div>
              <h2 className="text-hero-700 font-bold leading-hero-700 mb-100">{workspace.name}</h2>
              <div className="flex flex-wrap gap-200 mt-200">
                <span className="text-200 text-muted-foreground bg-muted px-300 py-100 rounded">
                  State: {workspace.state || '—'}
                </span>
                <span className="text-200 text-muted-foreground bg-muted px-300 py-100 rounded">
                  Admins: {workspace.adminCount}
                </span>
                <span className={cn(
                  'text-200 px-300 py-100 rounded font-medium',
                  workspace.gitConnected
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                )}>
                  {workspace.gitConnected ? '✓ Git Connected' : 'No Git'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-100 text-muted-foreground uppercase tracking-widest font-mono mb-100">Health Score</div>
              <div
                className="text-hero-800 font-bold"
                style={{ color: scoreColor(workspace.score), fontFamily: 'var(--font-numeric)' }}
              >
                {workspace.score.toFixed(0)}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-200 mb-400 border-b border-border">
          <button
            className={cn(
              'px-400 py-300 text-300 font-medium border-b-2 transition-colors',
              tab === 'violations'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setTab('violations')}
          >
            Violations ({violations.length})
          </button>
          <button
            className={cn(
              'px-400 py-300 text-300 font-medium border-b-2 transition-colors',
              tab === 'items'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setTab('items')}
          >
            Items ({items.length})
          </button>
        </div>

        {error && <p className="text-destructive text-300 mb-300">{error}</p>}

        {/* Violations tab */}
        {tab === 'violations' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
              <table className="w-full text-300">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-primary text-primary-foreground">
                    <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider w-28">Severity</th>
                    <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider hidden sm:table-cell">Rule ID</th>
                    <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <LoadingRow cols={3} />}
                  {!loading && violations.length === 0 && (
                    <EmptyRow cols={3} message="No violations found for this workspace." />
                  )}
                  {!loading && violations.map((v, i) => (
                    <tr
                      key={`${v.ruleId}-${i}`}
                      className={cn(
                        'border-t border-border',
                        i % 2 === 0 ? 'bg-card' : 'bg-background'
                      )}
                    >
                      <td className="px-400 py-300"><SeverityBadge severity={v.severity} /></td>
                      <td className="px-400 py-300 font-mono text-200 text-muted-foreground hidden sm:table-cell">{v.ruleId}</td>
                      <td className="px-400 py-300 text-foreground">{v.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Items tab */}
        {tab === 'items' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
              <table className="w-full text-300">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-primary text-primary-foreground">
                    <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider">Name</th>
                    <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider hidden sm:table-cell">Type</th>
                    <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider hidden md:table-cell">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <LoadingRow cols={3} />}
                  {!loading && items.length === 0 && (
                    <EmptyRow cols={3} message="No items found for this workspace." />
                  )}
                  {!loading && items.map((item, i) => (
                    <tr
                      key={item.itemId || i}
                      className={cn(
                        'border-t border-border',
                        i % 2 === 0 ? 'bg-card' : 'bg-background'
                      )}
                    >
                      <td className="px-400 py-300 text-foreground">{item.name}</td>
                      <td className="px-400 py-300 text-muted-foreground hidden sm:table-cell">{item.type}</td>
                      <td className="px-400 py-300 text-muted-foreground font-mono text-200 hidden md:table-cell">
                        {item.lastActivityDate ? item.lastActivityDate.substring(0, 10) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Screen 3: Violations Explorer ───────────────────────────────────────────

function ViolationsScreen({
  isDark,
  toggleTheme,
  onBack,
}: {
  isDark: boolean;
  toggleTheme: () => void;
  onBack: () => void;
}) {
  const [allViolations, setAllViolations] = useState<ViolationRecord[]>([]);
  const [filter, setFilter] = useState<ViolationSeverityFilter>('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const client = await getRayfinClient();

      const result = await client.connectors.sm_governance.executeQuery({
        query: `EVALUATE SELECTCOLUMNS(
          gold_health_rule_results,
          "workspaceId", gold_health_rule_results[workspace_id],
          "ruleId", gold_health_rule_results[rule_id],
          "workspaceName", RELATED(gold_workspaces[name]),
          "severity", gold_health_rule_results[severity],
          "detail", gold_health_rule_results[detail],
          "passed", gold_health_rule_results[passed]
        )`,
      });

      if (result.status === 'success') {
        const objs = rowsToObjects(result.table.columns, result.table.rows as unknown[][]);
        const rows: ViolationRecord[] = objs.map(o => ({
          workspaceId: String(o['workspaceId'] ?? ''),
          ruleId: String(o['ruleId'] ?? ''),
          workspaceName: String(o['workspaceName'] ?? ''),
          severity: String(o['severity'] ?? 'Low'),
          detail: String(o['detail'] ?? ''),
          passed: parseBool(o['passed']),
        }));
        rows.sort((a, b) => {
          const so = severityOrder(a.severity) - severityOrder(b.severity);
          if (so !== 0) return so;
          return a.workspaceName.localeCompare(b.workspaceName);
        });
        setAllViolations(rows);
      } else if (result.status === 'error') {
        setError(result.error.message);
      }
      setLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  }, []);

  if (!loaded && !loading) {
    void load();
  }

  const filtered = filter === 'All' ? allViolations : allViolations.filter(v => v.severity === filter);

  return (
    <div className="min-h-screen text-foreground flex flex-col">
      <AppHeader
        isDark={isDark}
        toggleTheme={toggleTheme}
        back={onBack}
        backLabel="Overview"
        title="🛡 Violations Explorer"
      />
      <main className="flex-1 px-600 py-500 max-w-6xl mx-auto w-full">

        {/* Filter bar + export */}
        <div className="flex flex-wrap items-center justify-between gap-300 mb-400">
          <div className="flex gap-200">
            {(['All', 'High', 'Medium', 'Low'] as ViolationSeverityFilter[]).map(sev => (
              <button
                key={sev}
                onClick={() => setFilter(sev)}
                className={cn(
                  'px-400 py-200 rounded-lg text-300 font-medium border transition-colors',
                  filter === sev
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {sev}
                {sev !== 'All' && (
                  <span className="ml-200 text-100 opacity-70">
                    ({allViolations.filter(v => v.severity === sev).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-300">
            <button
              onClick={load}
              disabled={loading}
              className="text-300 text-muted-foreground hover:text-foreground border border-border rounded-lg px-400 py-200 transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : '↻ Refresh'}
            </button>
            <button
              onClick={() => exportToCsv(filtered, `violations-${filter.toLowerCase()}.csv`)}
              disabled={filtered.length === 0}
              className="bg-primary text-primary-foreground rounded-lg px-400 py-200 text-300 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              ↓ Export CSV
            </button>
          </div>
        </div>

        {error && <p className="text-destructive text-300 mb-300">{error}</p>}

        {/* Rule summary table */}
        {loaded && allViolations.length > 0 && (() => {
          const summaryMap = new Map<string, { severity: string; count: number }>();
          allViolations.forEach(v => {
            const key = `${v.ruleId}||${v.severity}`;
            const existing = summaryMap.get(key);
            if (existing) {
              existing.count++;
            } else {
              summaryMap.set(key, { severity: v.severity, count: 1 });
            }
          });
          const summary = Array.from(summaryMap.entries())
            .map(([key, val]) => ({ ruleId: key.split('||')[0], ...val }))
            .sort((a, b) => b.count - a.count);

          return (
            <div className="bg-card border border-border rounded-xl overflow-hidden mb-400">
              <div className="px-400 pt-300 pb-200 border-b border-border">
                <span className="text-100 text-muted-foreground uppercase tracking-widest font-mono">
                  Rule Summary
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-300">
                  <thead>
                    <tr className="bg-muted text-muted-foreground">
                      <th className="text-left px-400 py-200 font-semibold text-200 uppercase tracking-wider">Rule ID</th>
                      <th className="text-left px-400 py-200 font-semibold text-200 uppercase tracking-wider hidden sm:table-cell">Severity</th>
                      <th className="text-right px-400 py-200 font-semibold text-200 uppercase tracking-wider">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row, i) => (
                      <tr
                        key={`${row.ruleId}-${row.severity}`}
                        className={cn(
                          'border-t border-border',
                          i % 2 === 0 ? 'bg-card' : 'bg-background'
                        )}
                      >
                        <td className="px-400 py-200 font-mono text-200 text-foreground">{row.ruleId}</td>
                        <td className="px-400 py-200 hidden sm:table-cell">
                          <SeverityBadge severity={row.severity} />
                        </td>
                        <td className="px-400 py-200 text-right font-bold tabular-nums text-foreground"
                          style={{ fontFamily: 'var(--font-numeric)' }}>
                          {row.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        <div className="text-200 text-muted-foreground mb-300">
          Showing {filtered.length} of {allViolations.length} violations
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-y-auto" style={{ maxHeight: '560px' }}>
            <table className="w-full text-300">
              <thead className="sticky top-0 z-10">
                <tr className="bg-primary text-primary-foreground">
                  <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider hidden sm:table-cell">Workspace</th>
                  <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider w-28">Severity</th>
                  <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider hidden md:table-cell">Rule ID</th>
                  <th className="text-left px-400 py-300 font-semibold text-200 uppercase tracking-wider">Detail</th>
                </tr>
              </thead>
              <tbody>
                {loading && <LoadingRow cols={4} />}
                {!loading && filtered.length === 0 && (
                  <EmptyRow cols={4} message={`No ${filter === 'All' ? '' : filter + ' '}violations found.`} />
                )}
                {!loading && filtered.map((v, i) => (
                  <tr
                    key={`${v.workspaceId}-${v.ruleId}-${i}`}
                    className={cn(
                      'border-t border-border',
                      i % 2 === 0 ? 'bg-card' : 'bg-background'
                    )}
                  >
                    <td className="px-400 py-300 text-foreground hidden sm:table-cell">{v.workspaceName}</td>
                    <td className="px-400 py-300"><SeverityBadge severity={v.severity} /></td>
                    <td className="px-400 py-300 font-mono text-200 text-muted-foreground hidden md:table-cell">{v.ruleId}</td>
                    <td className="px-400 py-300 text-foreground">{v.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const { isDark, toggleTheme } = useAppTheme();
  const [screen, setScreen] = useState<Screen>('overview');
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceHealth | null>(null);

  if (screen === 'detail' && selectedWorkspace) {
    return (
      <DetailScreen
        workspace={selectedWorkspace}
        isDark={isDark}
        toggleTheme={toggleTheme}
        onBack={() => setScreen('overview')}
      />
    );
  }

  if (screen === 'violations') {
    return (
      <ViolationsScreen
        isDark={isDark}
        toggleTheme={toggleTheme}
        onBack={() => setScreen('overview')}
      />
    );
  }

  return (
    <OverviewScreen
      isDark={isDark}
      toggleTheme={toggleTheme}
      onSelectWorkspace={ws => {
        setSelectedWorkspace(ws);
        setScreen('detail');
      }}
      onNavigateViolations={() => setScreen('violations')}
    />
  );
}
