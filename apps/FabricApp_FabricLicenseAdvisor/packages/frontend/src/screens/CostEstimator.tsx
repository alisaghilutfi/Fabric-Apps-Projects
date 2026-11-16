import { useState } from 'react';
import { useSemanticModelQuery } from '@/hooks/use-semantic-model-query';
import { cn } from '@/lib/utils';

const SKU_QUERY = `EVALUATE
SELECTCOLUMNS(
  TOPN(999, pricing_sku, pricing_sku[cus], ASC),
  "sku", pricing_sku[sku],
  "cus", pricing_sku[cus],
  "payg_per_month_usd", pricing_sku[payg_per_month_usd],
  "reserved_1yr_usd", pricing_sku[reserved_1yr_usd]
)`;

const LICENSE_QUERY = `EVALUATE
SELECTCOLUMNS(
  TOPN(999, pricing_user_licenses, pricing_user_licenses[price_per_user_usd], ASC),
  "license_type", pricing_user_licenses[license_type],
  "price_per_user_usd", pricing_user_licenses[price_per_user_usd]
)`;

interface SkuOption {
  sku: string;
  cus: number;
  payg: number;
  reserved_annual: number;
}

interface LicenseOption {
  license_type: string;
  price_per_user_usd: number;
}

function usd(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function ResultRow({
  label,
  value,
  highlight,
  dimmed,
}: {
  label: string;
  value: string;
  highlight?: 'green' | 'blue';
  dimmed?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg px-4 py-3',
        highlight === 'green' && 'bg-green-50 dark:bg-green-900/20',
        highlight === 'blue' && 'bg-primary/5',
        !highlight && 'bg-muted/30',
        dimmed && 'opacity-60'
      )}
    >
      <span
        className={cn(
          'text-sm',
          highlight ? 'font-medium text-foreground' : 'text-muted-foreground'
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'tabular-nums font-semibold',
          highlight === 'green' && 'text-green-700 dark:text-green-400',
          highlight === 'blue' && 'text-primary',
          !highlight && 'text-foreground'
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function CostEstimator() {
  const skuResult = useSemanticModelQuery({
    connection: 'sm_fabriclicenseadvisor',
    query: SKU_QUERY,
  });
  const licenseResult = useSemanticModelQuery({
    connection: 'sm_fabriclicenseadvisor',
    query: LICENSE_QUERY,
  });

  const [selectedSku, setSelectedSku] = useState<string>('');
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

  const isLoading = skuResult.isLoading || licenseResult.isLoading;
  const hasError =
    skuResult.error ||
    licenseResult.error ||
    skuResult.data?.status === 'error' ||
    licenseResult.data?.status === 'error';

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading pricing data…</p>
      </div>
    );
  }

  if (hasError) {
    const msg =
      skuResult.error?.message ??
      licenseResult.error?.message ??
      'Failed to load pricing data';
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg rounded-xl border border-destructive/40 bg-card p-6 text-center">
          <p className="mb-2 text-sm font-semibold text-destructive">
            Failed to load pricing data
          </p>
          <p className="mb-4 text-xs text-muted-foreground">{msg}</p>
          <button
            type="button"
            onClick={() => {
              void skuResult.refetch();
              void licenseResult.refetch();
            }}
            className="rounded border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const skus: SkuOption[] =
    skuResult.data?.status === 'success'
      ? skuResult.data.table.rows.map((r) => ({
          sku: r[0] as string,
          cus: r[1] as number,
          payg: r[2] as number,
          reserved_annual: r[3] as number,
        }))
      : [];

  const licenses: LicenseOption[] =
    licenseResult.data?.status === 'success'
      ? licenseResult.data.table.rows.map((r) => ({
          license_type: r[0] as string,
          price_per_user_usd: r[1] as number,
        }))
      : [];

  // Set default SKU selection on first render after data loads
  if (skus.length > 0 && selectedSku === '') {
    setSelectedSku(skus[0]?.sku ?? '');
  }

  const chosenSku = skus.find((s) => s.sku === selectedSku);
  const capacityPayg = chosenSku?.payg ?? 0;
  const capacityReservedMonthly = chosenSku
    ? chosenSku.reserved_annual / 12
    : 0;

  const userLicenseTotal = licenses.reduce((sum, lic) => {
    const count = userCounts[lic.license_type] ?? 0;
    return sum + count * lic.price_per_user_usd;
  }, 0);

  const totalPayg = capacityPayg + userLicenseTotal;
  const totalReserved = capacityReservedMonthly + userLicenseTotal;
  const annualSaving = (totalPayg - totalReserved) * 12;

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Cost Estimator
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare PAYG vs 1-year reserved pricing for a Fabric capacity +
            user licenses.
          </p>
        </div>

        {/* A — Capacity selector */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Capacity SKU
          </h2>
          <select
            value={selectedSku}
            onChange={(e) => setSelectedSku(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {skus.map((s) => (
              <option key={s.sku} value={s.sku}>
                {s.sku} — {s.cus} CUs
              </option>
            ))}
          </select>

          {chosenSku && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">PAYG / month</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {usd(chosenSku.payg)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Reserved / month
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {usd(capacityReservedMonthly)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ({usd(chosenSku.reserved_annual)} billed annually)
                </p>
              </div>
            </div>
          )}
        </section>

        {/* B — User license inputs */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            User Licenses
          </h2>
          <div className="space-y-3">
            {licenses.map((lic) => (
              <div key={lic.license_type} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {lic.license_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lic.price_per_user_usd === 0
                      ? 'Free'
                      : `${usd(lic.price_per_user_usd)} / user / month`}
                  </p>
                </div>
                <input
                  type="number"
                  min={0}
                  value={userCounts[lic.license_type] ?? 0}
                  onChange={(e) =>
                    setUserCounts((prev) => ({
                      ...prev,
                      [lic.license_type]: Math.max(
                        0,
                        parseInt(e.target.value, 10) || 0
                      ),
                    }))
                  }
                  className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-right text-sm tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="w-20 text-right text-sm tabular-nums text-muted-foreground">
                  {usd(
                    (userCounts[lic.license_type] ?? 0) *
                      lic.price_per_user_usd
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* C — Results panel */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Monthly Cost Summary
          </h2>
          <div className="space-y-2">
            <ResultRow
              label="Capacity — PAYG"
              value={usd(capacityPayg)}
              dimmed={capacityPayg === 0}
            />
            <ResultRow
              label="Capacity — Reserved (amortized)"
              value={usd(capacityReservedMonthly)}
              dimmed={capacityReservedMonthly === 0}
            />
            <ResultRow
              label="User licenses"
              value={usd(userLicenseTotal)}
              dimmed={userLicenseTotal === 0}
            />

            <div className="my-2 border-t border-border" />

            <ResultRow
              label="Total — PAYG path"
              value={usd(totalPayg)}
              highlight="blue"
            />
            <ResultRow
              label="Total — Reserved path"
              value={usd(totalReserved)}
              highlight="blue"
            />

            <div className="my-2 border-t border-border" />

            <ResultRow
              label="Annual saving (Reserved vs PAYG)"
              value={
                annualSaving > 0
                  ? `${usd(annualSaving)} saved`
                  : annualSaving < 0
                    ? `${usd(Math.abs(annualSaving))} more`
                    : '—'
              }
              highlight={annualSaving > 0 ? 'green' : undefined}
            />
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          Prices in USD · Source: sm_FabricLicenseAdvisor · Reserved price
          shown as monthly amortized (annual / 12)
        </p>
      </div>
    </div>
  );
}
