import { useState } from 'react';
import { useAppTheme } from './hooks/use-theme';
import { cn } from './lib/utils';
import { LicenseWizard } from './screens/LicenseWizard';
import { CostEstimator } from './screens/CostEstimator';
import { SkuReference } from './screens/SkuReference';
import { BreakEven } from './screens/BreakEven';

type Screen = 'wizard' | 'estimate' | 'skus' | 'breakeven';

const NAV: { id: Screen; label: string }[] = [
  { id: 'wizard', label: 'License Wizard' },
  { id: 'estimate', label: 'Cost Estimator' },
  { id: 'skus', label: 'SKU Reference' },
  { id: 'breakeven', label: 'Break-Even' },
];

export default function App() {
  const { isDark, toggleTheme } = useAppTheme();
  const [screen, setScreen] = useState<Screen>('wizard');

  return (
    <div className={cn('flex h-full flex-col', isDark && 'dark')}>
      <nav className="flex items-center gap-4 border-b border-border bg-card px-6 py-3">
        <span className="mr-4 text-sm font-semibold text-foreground">
          Fabric License Advisor
        </span>
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setScreen(n.id)}
            className={cn(
              'text-sm transition',
              screen === n.id
                ? 'font-semibold text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {n.label}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleTheme}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          {isDark ? 'Light' : 'Dark'}
        </button>
      </nav>
      <main className="flex-1 overflow-auto">
        {screen === 'wizard' && <LicenseWizard />}
        {screen === 'estimate' && <CostEstimator />}
        {screen === 'skus' && <SkuReference />}
        {screen === 'breakeven' && <BreakEven />}
      </main>
    </div>
  );
}
