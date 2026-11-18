import { useState } from 'react';
import { useSemanticModelQuery } from '@/hooks/use-semantic-model-query';
import { cn } from '@/lib/utils';

const SKU_QUERY = `EVALUATE
SELECTCOLUMNS(
  TOPN(999, pricing_sku, pricing_sku[cus], ASC),
  "sku", pricing_sku[sku],
  "cus", pricing_sku[cus],
  "payg_per_month_usd", pricing_sku[payg_per_month_usd],
  "reserved_1yr_usd", pricing_sku[reserved_1yr_usd],
  "free_viewer_allowed", pricing_sku[free_viewer_allowed],
  "copilot_enabled", pricing_sku[copilot_enabled]
)`;

const LICENSE_QUERY = `EVALUATE
SELECTCOLUMNS(
  TOPN(999, pricing_user_licenses, pricing_user_licenses[price_per_user_usd], ASC),
  "license_type", pricing_user_licenses[license_type],
  "price_per_user_usd", pricing_user_licenses[price_per_user_usd]
)`;

function usd(n: number, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: decimals,
  }).format(n);
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function BreakEvenCard({
  title,
  pricePerUser,
  paygBreakEven,
  reservedBreakEven,
}: {
  title: string;
  pricePerUser: number;
  paygBreakEven: number;
  reservedBreakEven: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-foreground">{title}</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            PAYG break-even
          </span>
          <span className="tabular-nums font-semibold text-foreground">
            {paygBreakEven.toLocaleString()} users
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Reserved break-even
          </span>
          <span className="tabular-nums font-semibold text-foreground">
            {reservedBreakEven.toLocaleString()} users
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Based on {usd(pricePerUser)}/user/month
        </p>
      </div>
    </div>
  );
}

export function BreakEven() {
  const skuResult = useSemanticModelQuery({
    connection: 'sm_fabriclicenseadvisor',
    query: SKU_QUERY,
  });
  const licenseResult = useSemanticModelQuery({
    connection: 'sm_fabriclicenseadvisor',
    query: LICENSE_QUERY,
  });

  const [proUserCount, setProUserCount] = useState(100);

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

  // Parse SKU data — find F64 (lowest SKU with free_viewer_allowed = true)
  const skus =
    skuResult.data?.status === 'success'
      ? skuResult.data.table.rows.map((r) => ({
          sku: r[0] as string,
          cus: r[1] as number,
          payg: r[2] as number,
          reserved_annual: r[3] as number,
          free_viewer_allowed: r[4] as boolean,
          copilot_enabled: r[5] as boolean,
        }))
      : [];

  // Parse license data
  const licenses =
    licenseResult.data?.status === 'success'
      ? licenseResult.data.table.rows.map((r) => ({
          license_type: r[0] as string,
          price_per_user_usd: r[1] as number,
        }))
      : [];

  // Find the pivot SKU: lowest CU count with free_viewer_allowed = true
  // Data is sorted ASC by cus, so first match is the pivot
  const pivotSku = skus.find((s) => s.free_viewer_allowed);

  const proLicense = licenses.find((l) => l.license_type === 'Pro');
  const ppuLicense = licenses.find((l) => l.license_type === 'PPU');

  if (!pivotSku || !proLicense || !ppuLicense) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          Pricing data unavailable.
        </p>
      </div>
    );
  }

  const paygMonthly = pivotSku.payg;
  const reservedMonthly = pivotSku.reserved_annual / 12;

  const proPrice = proLicense.price_per_user_usd;
  const ppuPrice = ppuLicense.price_per_user_usd;

  const proPaygBreakEven = Math.ceil(paygMonthly / proPrice);
  const proReservedBreakEven = Math.ceil(reservedMonthly / proPrice);
  const ppuPaygBreakEven = Math.ceil(paygMonthly / ppuPrice);
  const ppuReservedBreakEven = Math.ceil(reservedMonthly / ppuPrice);

  // Interactive "My org" section
  const currentProSpend = proUserCount * proPrice;
  const paygSaving = currentProSpend - paygMonthly;
  const reservedSaving = currentProSpend - reservedMonthly;

  let verdict: { text: string; tone: 'neutral' | 'payg' | 'reserved' };
  if (proUserCount < proPaygBreakEven) {
    verdict = { text: 'Per-user licensing is cheaper at this org size.', tone: 'neutral' };
  } else if (proUserCount < proReservedBreakEven) {
    verdict = {
      text: `${pivotSku.sku} PAYG is cheaper — save ${usd(paygSaving)}/month vs Pro licenses.`,
      tone: 'payg',
    };
  } else {
    verdict = {
      text: `${pivotSku.sku} Reserved saves the most — ${usd(reservedSaving)}/month vs Pro licenses.`,
      tone: 'reserved',
    };
  }

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Break-Even Calculator
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            At what org size does {pivotSku.sku} capacity become cheaper than
            individual user licenses?
          </p>
        </div>

        {/* F64 price summary */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {pivotSku.sku} — {pivotSku.cus} CUs
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Lowest SKU with Free Viewer + Copilot
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoPill label="PAYG / month" value={usd(paygMonthly)} />
            <InfoPill
              label="Reserved / month (amortized)"
              value={usd(reservedMonthly)}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Reserved annual: {usd(pivotSku.reserved_annual)} billed upfront
          </p>
        </section>

        {/* Break-even cards */}
        <div className="grid grid-cols-2 gap-4">
          <BreakEvenCard
            title={`vs Pro (${usd(proPrice)}/user)`}
            pricePerUser={proPrice}
            paygBreakEven={proPaygBreakEven}
            reservedBreakEven={proReservedBreakEven}
          />
          <BreakEvenCard
            title={`vs PPU (${usd(ppuPrice)}/user)`}
            pricePerUser={ppuPrice}
            paygBreakEven={ppuPaygBreakEven}
            reservedBreakEven={ppuReservedBreakEven}
          />
        </div>

        {/* Interactive section */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            My Org
          </h2>

          <div className="mb-6 space-y-2">
            <label className="text-sm text-muted-foreground">
              How many Pro users do you have?
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={1000}
                step={5}
                value={proUserCount}
                onChange={(e) => setProUserCount(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <input
                type="number"
                min={0}
                value={proUserCount}
                onChange={(e) =>
                  setProUserCount(Math.max(0, parseInt(e.target.value, 10) || 0))
                }
                className="w-20 rounded-lg border border-input bg-background px-3 py-2 text-right text-sm tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Current spend ({proUserCount} × Pro)
              </span>
              <span className="tabular-nums font-semibold text-foreground">
                {usd(currentProSpend)}/mo
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                {pivotSku.sku} PAYG cost
              </span>
              <span className="tabular-nums font-semibold text-foreground">
                {usd(paygMonthly)}/mo
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                {pivotSku.sku} Reserved cost
              </span>
              <span className="tabular-nums font-semibold text-foreground">
                {usd(reservedMonthly)}/mo
              </span>
            </div>
          </div>

          <div
            className={cn(
              'mt-4 rounded-xl px-4 py-4 text-sm font-medium',
              verdict.tone === 'neutral' &&
                'bg-muted/40 text-muted-foreground',
              verdict.tone === 'payg' &&
                'bg-primary/10 text-primary',
              verdict.tone === 'reserved' &&
                'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            )}
          >
            {verdict.text}
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          Prices in USD · Source: sm_FabricLicenseAdvisor · Break-even assumes
          all users are view-only (free on {pivotSku.sku}+)
        </p>
      </div>
    </div>
  );
}
