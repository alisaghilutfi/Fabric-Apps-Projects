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

lh_usgs_earthquake connector removed (TDS port 1433 blocked; folder deleted 2026-11-01).

## Semantic Model (sm_USGS_Earthquake)
- Item ID: 856acf3d-ddbc-4ed7-87a8-559018c12f05
- Mode: Direct Lake on earthquake_events_gold + DateDimension
- 17 DAX measures across Magnitude / Significance / Time / Time Intelligence / Volume folders

## App Design -- 3 Screens (all built and deployed)
- Search: country autocomplete (75 countries), animated seismograph SVG bg (CSS keyframe scroll,
  3 traces, cyan on dark gradient), dark overlay so form is readable; white/white-70 text on bg
- Results: KPI cards (Total Earthquakes, Avg/Max Magnitude, Max Significance, % High Significance)
  via EVALUATE ROW(...); split layout: scrollable table (top, maxH 300px) + Leaflet map (bottom,
  340px); table rows highlight on click; map markers coloured by magnitude (green/orange/red);
  clicking a map marker highlights+scrolls the corresponding table row; dark mode swaps to
  CartoDB Dark Matter tile layer; Back button
- Subscribe: AlertSubscription entity write (countryCode + minMagnitude slider), success/error states

## AlertSubscription Entity (packages/data/src/Subscription.ts)
Fields: id (uuid), countryCode (text 2), minMagnitude (decimal 1.0-9.9), createdAt (date), userId (text)
Policy: authenticated user owns their own record (claims.sub.eq(item.userId))

## Key Components
- `packages/frontend/src/components/EarthquakeMap.tsx` -- Leaflet map, magnitude-coloured CircleMarker,
  light (OSM) / dark (CartoDB) tile swap, fitBounds to event set, tooltip on hover, bidirectional
  highlight with parent via highlightId + onSelectId props
- Leaflet installed: `leaflet@1.9.4`, `@types/leaflet@1.9.22` in frontend package.json

## Open Items
- Pipeline schedule: pl_USGS_Earthquake runs on demand only; Gold table grows stale between runs
- Earthquake events table may not always have Latitude/Longitude -- EarthquakeMap filters
  `p.lat != null && p.lng != null` so it renders safely with a partial point set
- Root.spec.tsx: no known failures at last deploy

## Last Session -- 2026-11-01 (session 2)

### What was done
- Added `leaflet@1.9.4` + `@types/leaflet@1.9.22` to `packages/frontend/package.json`
- Created `packages/frontend/src/components/EarthquakeMap.tsx`:
  - Leaflet map with OSM (light) / CartoDB Dark Matter (dark) tile swap via `isDark` prop
  - CircleMarker per earthquake; colour = magnitude band (green <4, orange 4-6, red >=6)
  - `fitBounds` auto-zooms to the result set
  - Tooltip: magnitude + place description
  - Bidirectional sync: clicking marker calls `onSelectId`; `highlightId` enlarges + outlines marker
- Replaced `SeismographBg` (static SVG) with `SeismographAnimBg`:
  - CSS `seis-scroll` keyframe scrolls 3 sine-wave traces across the screen
  - Gradient dark background (`#0a1628 -> #0f2540`), cyan traces at varying opacities
  - Built-in `bg-black/55` overlay div -- no separate overlay needed at the screen level
- Results screen restructured: scrollable table (sticky header, 300px max-height) + map (340px) in a
  flex column; table rows clickable, `highlightId` state wired to both table and map
- Frontend TS typecheck: zero errors; Vite build: clean (chunk size warning only)
- Deployed via `npx rayfin up`

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
- Leaflet marker icon fix required (same as RTI): delete `_getIconUrl` and mergeOptions with
  `iconUrl`/`iconRetinaUrl`/`shadowUrl` -- already done in `EarthquakeMap.tsx`
