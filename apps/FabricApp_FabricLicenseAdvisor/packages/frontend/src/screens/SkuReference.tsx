import { useSemanticModelQuery } from '@/hooks/use-semantic-model-query';
import { cn } from '@/lib/utils';

const QUERY = `EVALUATE
SELECTCOLUMNS(
  TOPN(999, pricing_sku, pricing_sku[cus], ASC),
  "sku", pricing_sku[sku],
  "cus", pricing_sku[cus],
  "vcores", pricing_sku[vcores],
  "payg_per_month_usd", pricing_sku[payg_per_month_usd],
  "reserved_1yr_usd", pricing_sku[reserved_1yr_usd],
  "free_viewer_allowed", pricing_sku[free_viewer_allowed],
  "copilot_enabled", pricing_sku[copilot_enabled],
  "pbi_equivalent", pricing_sku[pbi_equivalent]
)`;

interface SkuRow {
  sku: string;
  cus: number;
  vcores: number;
  payg_per_month_usd: number;
  reserved_1yr_usd: number;
  free_viewer_allowed: boolean;
  copilot_enabled: boolean;
  pbi_equivalent: string | null;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function Badge({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
        ok
          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
          : 'bg-muted text-muted-foreground'
      )}
    >
      {ok ? 'Yes' : 'No'}
    </span>
  );
}

export function SkuReference() {
  const { data, isLoading, error, refetch } = useSemanticModelQuery({
    connection: 'sm_fabriclicenseadvisor',
    query: QUERY,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading SKU data…</p>
      </div>
    );
  }

  if (error || data?.status === 'error') {
    const msg =
      error?.message ??
      (data?.status === 'error' ? data.error.message : 'Unknown error');
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg rounded-xl border border-destructive/40 bg-card p-6 text-center">
          <p className="mb-2 text-sm font-semibold text-destructive">
            Failed to load SKU data
          </p>
          <p className="mb-4 text-xs text-muted-foreground">{msg}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const rows: SkuRow[] =
    data?.status === 'success'
      ? data.table.rows.map((r) => ({
          sku: r[0] as string,
          cus: r[1] as number,
          vcores: r[2] as number,
          payg_per_month_usd: r[3] as number,
          reserved_1yr_usd: r[4] as number,
          free_viewer_allowed: r[5] as boolean,
          copilot_enabled: r[6] as boolean,
          pbi_equivalent: r[7] as string | null,
        }))
      : [];

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Fabric SKU Reference
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All available Fabric capacity SKUs with PAYG and 1-year reserved
            pricing (USD).
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  SKU
                </th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">
                  CUs
                </th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">
                  vCores
                </th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">
                  PAYG / month
                </th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">
                  Reserved 1yr / month
                </th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">
                  Free Viewer
                </th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">
                  Copilot
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  PBI Equiv.
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.sku}
                  className={cn(
                    'border-b border-border transition-colors hover:bg-accent/50',
                    i % 2 === 1 && 'bg-muted/20'
                  )}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.sku}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {row.cus}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {row.vcores}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {formatUsd(row.payg_per_month_usd)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {formatUsd(row.reserved_1yr_usd)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge ok={row.free_viewer_allowed} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge ok={row.copilot_enabled} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.pbi_equivalent ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          {rows.length} SKUs · Prices in USD · Source: sm_FabricLicenseAdvisor
        </p>
      </div>
    </div>
  );
}
