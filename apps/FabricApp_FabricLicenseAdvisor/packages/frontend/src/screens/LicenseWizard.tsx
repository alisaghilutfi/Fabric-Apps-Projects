import { useState } from 'react';
import { useSemanticModelQuery } from '@/hooks/use-semantic-model-query';
import { cn } from '@/lib/utils';

// ─── Queries ─────────────────────────────────────────────────────────────────

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
  "price_per_user_usd", pricing_user_licenses[price_per_user_usd],
  "can_create_content", pricing_user_licenses[can_create_content],
  "fabric_items_access", pricing_user_licenses[fabric_items_access]
)`;

// ─── Types ───────────────────────────────────────────────────────────────────

interface SkuRow {
  sku: string;
  cus: number;
  payg: number;
  reserved_annual: number;
  free_viewer_allowed: boolean;
  copilot_enabled: boolean;
}

interface LicenseRow {
  license_type: string;
  price_per_user_usd: number;
  can_create_content: boolean;
  fabric_items_access: boolean;
}

type Step1Choice = 'view' | 'create' | 'fabric';
type Step2ViewResult = { userCount: number };
type Step2CreateResult = { needsFabric: boolean };
type Step2FabricResult = { scale: 'starter' | 'production' | 'enterprise' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function usd(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Use case', 'Details', 'Recommendation'];
  return (
    <div className="mb-8 flex items-center gap-2">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = step > idx;
        const active = step === idx;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                done && 'bg-primary text-primary-foreground',
                active && 'border-2 border-primary text-primary',
                !done && !active && 'border-2 border-border text-muted-foreground'
              )}
            >
              {done ? '✓' : idx}
            </div>
            <span
              className={cn(
                'text-xs',
                active ? 'font-semibold text-foreground' : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'mx-1 h-px w-8',
                  step > idx ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChoiceCard({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border-2 p-4 text-left transition',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:border-primary/40 hover:bg-accent/50'
      )}
    >
      <p className={cn('text-sm font-semibold', selected ? 'text-primary' : 'text-foreground')}>
        {title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function SkuCard({ sku }: { sku: SkuRow }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-sm font-semibold text-foreground">{sku.sku}</p>
      <p className="text-xs text-muted-foreground">{sku.cus} CUs</p>
      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">PAYG</span>
          <span className="tabular-nums font-medium text-foreground">{usd(sku.payg)}/mo</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Reserved</span>
          <span className="tabular-nums font-medium text-foreground">
            {usd(sku.reserved_annual / 12)}/mo
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          ({usd(sku.reserved_annual)}/yr)
        </p>
      </div>
      {sku.free_viewer_allowed && (
        <span className="mt-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
          Free viewer
        </span>
      )}
      {sku.copilot_enabled && (
        <span className="ml-1 mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Copilot
        </span>
      )}
    </div>
  );
}

function NavRow({
  onBack,
  backLabel = 'Back',
  onReset,
}: {
  onBack?: () => void;
  backLabel?: string;
  onReset?: () => void;
}) {
  return (
    <div className="mt-6 flex items-center gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
        >
          ← {backLabel}
        </button>
      )}
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Start over
        </button>
      )}
    </div>
  );
}

// ─── Result panels ────────────────────────────────────────────────────────────

function ResultView({
  skus,
  licenses,
  step1,
  step2View,
  step2Create,
  step2Fabric,
  onBack,
  onReset,
}: {
  skus: SkuRow[];
  licenses: LicenseRow[];
  step1: Step1Choice;
  step2View?: Step2ViewResult;
  step2Create?: Step2CreateResult;
  step2Fabric?: Step2FabricResult;
  onBack: () => void;
  onReset: () => void;
}) {
  const pro = licenses.find((l) => l.license_type === 'Pro');
  const ppu = licenses.find((l) => l.license_type === 'PPU');
  const pivotSku = skus.find((s) => s.free_viewer_allowed);

  // ── Path A ──
  if (step1 === 'view' && step2View && pivotSku && pro) {
    const N = step2View.userCount;
    const proMonthly = N * pro.price_per_user_usd;
    const paygMonthly = pivotSku.payg;
    const reservedMonthly = pivotSku.reserved_annual / 12;
    const paygBreakEven = Math.ceil(paygMonthly / pro.price_per_user_usd);
    const reservedBreakEven = Math.ceil(reservedMonthly / pro.price_per_user_usd);

    let recommendation: string;
    let cost: string;
    let note: string;

    if (N < paygBreakEven) {
      recommendation = `Pro licenses — ${usd(proMonthly)}/month`;
      cost = usd(proMonthly);
      note = `Capacity becomes cheaper at ${paygBreakEven} users (PAYG) or ${reservedBreakEven} users (Reserved)`;
    } else if (N < reservedBreakEven) {
      recommendation = `${pivotSku.sku} PAYG — ${usd(paygMonthly)}/month`;
      cost = usd(paygMonthly);
      note = `Reserved saves more at ${reservedBreakEven}+ users — ${usd(reservedMonthly)}/month`;
    } else {
      recommendation = `${pivotSku.sku} Reserved — ${usd(reservedMonthly)}/month (amortized)`;
      cost = usd(reservedMonthly);
      note = `Best value at your scale; also unlocks Copilot`;
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Recommended
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {recommendation}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            All options for {N} users
          </p>
          <div className="space-y-2">
            {[
              { label: `Pro × ${N}`, value: proMonthly },
              { label: `${pivotSku.sku} PAYG`, value: paygMonthly },
              { label: `${pivotSku.sku} Reserved`, value: reservedMonthly },
            ].map((opt) => (
              <div key={opt.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{opt.label}</span>
                <span
                  className={cn(
                    'tabular-nums font-medium',
                    usd(opt.value) === cost ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {usd(opt.value)}/mo
                </span>
              </div>
            ))}
          </div>
        </div>
        <NavRow onBack={onBack} backLabel="Back" onReset={onReset} />
      </div>
    );
  }

  // ── Path B ──
  if (step1 === 'create' && step2Create) {
    const target = step2Create.needsFabric ? ppu : pro;
    const other = step2Create.needsFabric ? pro : ppu;
    if (!target || !other) return null;

    return (
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Recommended
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {target.license_type} — {usd(target.price_per_user_usd)}/user/month
          </p>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {target.can_create_content && <li>✓ Create &amp; share Power BI content</li>}
            {target.fabric_items_access && <li>✓ Access Fabric data items (Lakehouse, Notebooks, Pipelines)</li>}
            {!target.fabric_items_access && <li>✗ Fabric data item access not included</li>}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            For comparison — {other.license_type}
          </p>
          <p className="text-sm text-foreground">
            {usd(other.price_per_user_usd)}/user/month
          </p>
          {step2Create.needsFabric && !other.fabric_items_access && (
            <p className="mt-1 text-xs text-muted-foreground">
              Does not include Fabric item access
            </p>
          )}
        </div>
        <NavRow onBack={onBack} backLabel="Back" onReset={onReset} />
      </div>
    );
  }

  // ── Path C ──
  if (step1 === 'fabric' && step2Fabric) {
    const skuRanges: Record<string, string[]> = {
      starter: ['F2', 'F4'],
      production: ['F8', 'F16', 'F32'],
      enterprise: ['F64', 'F128', 'F256'],
    };
    const targetSkus = skus.filter((s) =>
      skuRanges[step2Fabric.scale].includes(s.sku)
    );
    const scaleLabels: Record<string, string> = {
      starter: 'Starter — dev/test, light workloads',
      production: 'Production — scheduled pipelines, reports',
      enterprise: 'Enterprise — heavy compute, AI, Copilot',
    };

    return (
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Recommended range
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {scaleLabels[step2Fabric.scale]}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {targetSkus.map((s) => (
            <SkuCard key={s.sku} sku={s} />
          ))}
        </div>

        {targetSkus.length === 0 && (
          <p className="text-sm text-muted-foreground">
            SKU data not available for this range.
          </p>
        )}

        <NavRow onBack={onBack} backLabel="Back" onReset={onReset} />
      </div>
    );
  }

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LicenseWizard() {
  const skuResult = useSemanticModelQuery({
    connection: 'sm_fabriclicenseadvisor',
    query: SKU_QUERY,
  });
  const licenseResult = useSemanticModelQuery({
    connection: 'sm_fabriclicenseadvisor',
    query: LICENSE_QUERY,
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [step1, setStep1] = useState<Step1Choice | null>(null);
  const [step2View, setStep2View] = useState<Step2ViewResult>({ userCount: 50 });
  const [step2Create, setStep2Create] = useState<Step2CreateResult | null>(null);
  const [step2Fabric, setStep2Fabric] = useState<Step2FabricResult | null>(null);

  const isLoading = skuResult.isLoading || licenseResult.isLoading;
  const hasError =
    skuResult.error ||
    licenseResult.error ||
    skuResult.data?.status === 'error' ||
    licenseResult.data?.status === 'error';

  const skus: SkuRow[] =
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

  const licenses: LicenseRow[] =
    licenseResult.data?.status === 'success'
      ? licenseResult.data.table.rows.map((r) => ({
          license_type: r[0] as string,
          price_per_user_usd: r[1] as number,
          can_create_content: r[2] as boolean,
          fabric_items_access: r[3] as boolean,
        }))
      : [];

  function reset() {
    setStep(1);
    setStep1(null);
    setStep2View({ userCount: 50 });
    setStep2Create(null);
    setStep2Fabric(null);
  }

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

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">
            License Advisor
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Answer a few questions to get a tailored Fabric licensing
            recommendation.
          </p>
        </div>

        <ProgressBar step={step} />

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="mb-4 text-sm font-medium text-foreground">
              What is the primary use case?
            </p>
            <ChoiceCard
              selected={step1 === 'view'}
              onClick={() => setStep1('view')}
              title="View reports and dashboards only"
              description="Users need read access to published Power BI content — no authoring."
            />
            <ChoiceCard
              selected={step1 === 'create'}
              onClick={() => setStep1('create')}
              title="Create and share Power BI reports"
              description="Users build reports, publish to workspaces, and share with others."
            />
            <ChoiceCard
              selected={step1 === 'fabric'}
              onClick={() => setStep1('fabric')}
              title="Build Fabric data items"
              description="Engineers using Lakehouses, Notebooks, Pipelines, or other Fabric workloads."
            />
            <div className="mt-4">
              <button
                type="button"
                disabled={!step1}
                onClick={() => step1 && setStep(2)}
                className={cn(
                  'rounded-lg px-6 py-2.5 text-sm font-semibold transition',
                  step1
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground'
                )}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && step1 === 'view' && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">
              How many users need view access?
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={1000}
                step={5}
                value={step2View.userCount}
                onChange={(e) =>
                  setStep2View({ userCount: Number(e.target.value) })
                }
                className="flex-1 accent-primary"
              />
              <input
                type="number"
                min={1}
                value={step2View.userCount}
                onChange={(e) =>
                  setStep2View({
                    userCount: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
                className="w-20 rounded-lg border border-input bg-background px-3 py-2 text-right text-sm tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {step2View.userCount} users
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
              >
                See recommendation →
              </button>
            </div>
            <NavRow onBack={() => setStep(1)} />
          </div>
        )}

        {step === 2 && step1 === 'create' && (
          <div className="space-y-3">
            <p className="mb-4 text-sm font-medium text-foreground">
              Do any users need Fabric data item access?
            </p>
            <ChoiceCard
              selected={step2Create?.needsFabric === true}
              onClick={() => setStep2Create({ needsFabric: true })}
              title="Yes — users will access Lakehouses, Notebooks, or Pipelines"
              description="Requires Power BI Premium Per User (PPU) or a Fabric capacity."
            />
            <ChoiceCard
              selected={step2Create?.needsFabric === false}
              onClick={() => setStep2Create({ needsFabric: false })}
              title="No — Power BI authoring only"
              description="Standard report building and workspace sharing."
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={step2Create === null}
                onClick={() => step2Create !== null && setStep(3)}
                className={cn(
                  'rounded-lg px-6 py-2.5 text-sm font-semibold transition',
                  step2Create !== null
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground'
                )}
              >
                See recommendation →
              </button>
            </div>
            <NavRow onBack={() => setStep(1)} />
          </div>
        )}

        {step === 2 && step1 === 'fabric' && (
          <div className="space-y-3">
            <p className="mb-4 text-sm font-medium text-foreground">
              What compute scale do you need?
            </p>
            <ChoiceCard
              selected={step2Fabric?.scale === 'starter'}
              onClick={() => setStep2Fabric({ scale: 'starter' })}
              title="Starter — dev/test, light workloads"
              description="Small teams, proof of concept, infrequent pipeline runs. F2–F4 range."
            />
            <ChoiceCard
              selected={step2Fabric?.scale === 'production'}
              onClick={() => setStep2Fabric({ scale: 'production' })}
              title="Production — scheduled pipelines, reports"
              description="Regular ETL, shared semantic models, departmental reporting. F8–F32 range."
            />
            <ChoiceCard
              selected={step2Fabric?.scale === 'enterprise'}
              onClick={() => setStep2Fabric({ scale: 'enterprise' })}
              title="Enterprise — heavy compute, AI, Copilot"
              description="Large data volumes, real-time analytics, Copilot features, free viewer seats. F64+ range."
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={step2Fabric === null}
                onClick={() => step2Fabric !== null && setStep(3)}
                className={cn(
                  'rounded-lg px-6 py-2.5 text-sm font-semibold transition',
                  step2Fabric !== null
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground'
                )}
              >
                See recommendation →
              </button>
            </div>
            <NavRow onBack={() => setStep(1)} />
          </div>
        )}

        {/* ── STEP 3 — Result ── */}
        {step === 3 && step1 && (
          <ResultView
            skus={skus}
            licenses={licenses}
            step1={step1}
            step2View={step1 === 'view' ? step2View : undefined}
            step2Create={step1 === 'create' ? (step2Create ?? undefined) : undefined}
            step2Fabric={step1 === 'fabric' ? (step2Fabric ?? undefined) : undefined}
            onBack={() => setStep(2)}
            onReset={reset}
          />
        )}
      </div>
    </div>
  );
}
