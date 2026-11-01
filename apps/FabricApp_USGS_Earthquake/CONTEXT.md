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

### Search
Country autocomplete (75 countries), animated seismograph SVG bg (CSS keyframe scroll, 3 cyan
traces on dark gradient), dark overlay, white/white-70 text on bg.

### Results -- 3-zone layout
**Zone 1 — Animated header** (full-width, relative overflow-hidden):
- SeismographAnimBg (same component as Search) fills the zone
- bg-black/55 overlay built into SeismographAnimBg
- Title (country name) + subtitle (last-30-days count) in white/white-60
- 5 KPI cards in a 2-col/5-col grid below the title (bg-card floats on dark bg)
- All via EVALUATE ROW(...) on sm_usgs_earthquake

**Zone 2 — Data (solid bg-background surface)**:
- Scrollable event table (sticky header, maxH 300px): Time / Location / Mag / Class
  - Rows clickable, highlighted row gets bg-primary/15 + left border
- Leaflet earthquake map (340px): CircleMarker coloured by magnitude band (green/orange/red),
  fitBounds to result set, OSM (light) / CartoDB Dark Matter (dark) tile swap
- Bidirectional highlight: clicking table row or map marker syncs both

**Zone 2 photo slideshow bg:** 4 images cycle every 5 s via pure CSS `@keyframes slide-fade` with
staggered `animation-delay` (0s, 5s, 10s, 15s); no JS timer. bg-black/60 overlay for readability.
Table: bg-card/90 + backdrop-blur-sm. Map: OSM tiles only (CartoDB removed).
Files: `src/assets/earthquakes/` (sf1906.jpg, sf1906train.jpg, kobe1995.jpg, aegean2020.jpg)

**Subscribe button** at bottom of Zone 2.

### Subscribe
AlertSubscription entity write (countryCode + minMagnitude slider), success/error states.

## AlertSubscription Entity (packages/data/src/Subscription.ts)
Fields: id (uuid), countryCode (text 2), minMagnitude (decimal 1.0-9.9), createdAt (date), userId (text)
Policy: authenticated user owns their own record (claims.sub.eq(item.userId))

## Key Components
- `packages/frontend/src/components/EarthquakeMap.tsx` -- Leaflet map
- `packages/frontend/src/assets/earthquakes/` -- 4 bundled earthquake photos
- Leaflet: `leaflet@1.9.4`, `@types/leaflet@1.9.22` in frontend package.json

## Open Items
- Pipeline schedule: pl_USGS_Earthquake runs on demand only; Gold table grows stale between runs
- Earthquake events may not always return Latitude/Longitude columns (model-dependent);
  EarthquakeMap filters null lat/lng safely
- Subscribe screen: not yet tested end-to-end with a real user session (entity write)
- Root.spec.tsx: no known failures at last deploy

## Last Session -- 2026-11-01 (session 5)

### What was done
- Replaced CartoDB Dark Matter map tiles with OSM tiles throughout EarthquakeMap.tsx
- Removed `isDark` prop from `EarthquakeMap` component and interface; removed tile-swap useEffect
- Single tile source: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Updated App.tsx call site to drop `isDark` prop
- Frontend TS typecheck: zero errors; Vite build: clean
- Deployed via `npx rayfin up`

### Current state
- All 3 screens complete and deployed
- Live URL: https://daily-cave-2c1879b505-northeurope.webapp.fabricapps.net
- F2 capacity: pause after session

### Build notes (persistent gotchas)
- `tsc` not on PATH; after fresh `npm install` use `.\node_modules\typescript\bin\tsc`
- Build order: `node $tsc -b packages/shared --force` then `node $tsc -b packages/data --force`
  (remove .tsbuildinfo if dist/index.js not emitting)
- Frontend standalone typecheck: `node ..\..\node_modules\typescript\bin\tsc --noEmit` from `packages/frontend`
- Leaflet marker icon fix in `EarthquakeMap.tsx`: delete `_getIconUrl` + mergeOptions
- Wikimedia Commons direct file downloads: use curl with browser User-Agent + Referer header;
  thumbnail URLs (thumb/ paths) often 404 -- use the canonical file URL from the wiki page instead
