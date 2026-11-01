# FabricApp_USGS_Earthquake

## App Info
- Workspace: ws_USGS_Earthquake (ID: 39caa3ab-a964-45c2-bd5b-7d46ad66c985)
- Rayfin item ID (AppBackend): 251ae692-14f8-4fc9-a41b-c12ecbfa0904
- Live URL: https://daily-cave-2c1879b505-northeurope.webapp.fabricapps.net
- Stack: React + Vite, create-rayfin@1.36.2, blankapp template
- Packs: data-modeling, connectors, analytics
- Status: Deployed (2026-10-21, Tailwind DM Sans/DM Mono design system)

## Connectors
| Alias | Type | Notes |
|---|---|---|
| sm_usgs_earthquake | fabric-semanticmodel | Live, wired into connectors.ts |

lh_usgs_earthquake connector removed (TDS port 1433 blocked; folder deleted, never wired in connectors.ts).

## Semantic Model (sm_USGS_Earthquake)
- Item ID: 856acf3d-ddbc-4ed7-87a8-559018c12f05
- Mode: Direct Lake on earthquake_events_gold + DateDimension
- 17 DAX measures across Magnitude / Significance / Time / Time Intelligence / Volume folders

## App Design -- 3 Screens (all built and deployed)
- Search: country autocomplete (75 countries), seismograph SVG background, Submit button
- Results: KPI cards (Total Earthquakes, Avg/Max Magnitude, Max Significance, % High Significance)
  via EVALUATE ROW(...), earthquake list via TOPN 50 / last-30-days filter; Back button
- Subscribe: AlertSubscription entity write (countryCode + minMagnitude slider), success/error states

## AlertSubscription Entity (packages/data/src/Subscription.ts)
Fields: id (uuid), countryCode (text 2), minMagnitude (decimal 1.0-9.9), createdAt (date), userId (text)
Policy: authenticated user owns their own record (claims.sub.eq(item.userId))

## Open Items
- Pipeline schedule: pl_USGS_Earthquake runs on demand only; Gold table grows stale between runs
- Root.spec.tsx: no known failures at last deploy

## Last Session -- 2026-11-01

### What was done
- Deleted dead `rayfin/connectors/lh_usgs_earthquake/` folder (placeholder schema only, never wired)
- Upgraded KPI cards in `App.tsx` to RTI icon+accent pattern: lucide icons (Activity/BarChart2/TrendingUp/Zap/AlertTriangle), `KpiCard` component with `borderTop: 3px solid accent`, `KPI_META` map per measure
- Built shared+data packages (force-cleared `.tsbuildinfo` to get dist/index.js generated)
- Frontend TS typecheck: zero errors
- Deployed via `npx rayfin up` -- build succeeded, static hosting updated

### Current state
- All 3 screens complete and deployed
- Live URL: https://daily-cave-2c1879b505-northeurope.webapp.fabricapps.net
- F2 capacity: pause after session

### Build notes (persistent gotchas)
- `tsc` not on PATH; after fresh `npm install` use `.\node_modules\typescript\bin\tsc`
- Build order: `node $tsc -b packages/shared --force` then `node $tsc -b packages/data --force`
  (remove .tsbuildinfo files if dist/index.js not emitting -- composite incremental skips clean builds)
- Frontend standalone typecheck: `node ..\..\node_modules\typescript\bin\tsc --noEmit` from `packages/frontend`
- `npm run build` at app root runs data then frontend; uses PATH tsc (requires fresh npm install to resolve)
