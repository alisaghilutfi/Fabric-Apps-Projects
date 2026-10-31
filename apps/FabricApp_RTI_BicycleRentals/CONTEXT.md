# FabricApp_RTI_BicycleRentals

## App Info
- Workspace: ws_RTI_BicycleRentals (ID: 7bdd5482-61f9-4cb6-b70e-42723751f60f)
- Rayfin item ID: 3d942f93-b1f3-4e01-abf8-e664b0ff969b
- Live URL: https://humid-gem-4f2e8b4d0a-northeurope.webapp.fabricapps.net
- Stack: React + Vite, create-rayfin@1.36.2, universal-app template
- Packs: data-modeling, connectors, analytics
- Status: Deployed (2026-10-22)

## Connector
| Alias | Type | Notes |
|---|---|---|
| sm_rti_bicyclerentals | fabric-semanticmodel | Live, delegated auth, version "1" |

## Semantic Model (sm_RTI_BicycleRentals)
- Item ID: e50ec3a9-c600-446d-b856-44946bcd78ce
- Mode: DirectQuery on LatestStationSnapshot() (KQL function)
- Table: Station Snapshot (120 stations live)
- 10 measures: Availability / Capacity / Rebalancing / Recency folders
- Validated: Total Stations = 120, Network Utilization % = 48.1%

## App Design -- 3 Screens
- Network Overview: KPI cards (Total Stations, Network Utilization %, Stations Needing Restock)
  + 120-station table filtered by Action = Fill | Empty | All
- Station Detail: per-station stats + "Flag for Rebalancing" button (writes AlertSubscription)
- Rebalancing Queue: flagged AlertSubscription records + mark-resolved flow

## AlertSubscription Entity
Fields: stationId (int), street, neighbourhood, action, flaggedAt, resolvedAt (optional), userId

## Open Items
- Root.spec.tsx: 3 failures (scaffold EmptyStatePreview placeholder tests -- non-blocking)
- Optional: neighbourhood filter dropdown on Network Overview
- Optional: mark-resolved flow on Rebalancing Queue (set resolvedAt)
- rpt_RTI_BicycleRentals: blocked on Trial capacity (manifest.json 404)
- es_RTI_BicycleRentals Eventstream: may go inactive -- restart via Fabric portal if KQL counts stale

## Last Session -- 2026-10-31

### What was done (Phase 1 + Phase 2, same session)

**Phase 1 — Network Overview Polish**
- Restarted Eventstream (was stale since 2026-10-22); confirmed `rowsLast1h = 1020`
- `global.css`: status colour tokens + `live-dot` keyframe animation
- New `src/lib/stationStatus.ts`: `getStationStatus()` + `statusConfig` (with explicit `bar` field)
- `App.tsx`: `fetchSnapshot` / `startPolling` replace `loadOverview`; 30s `setInterval` via `intervalRef`
- Live pulsing dot in AppHeader (green = live, grey = error); `showLiveDot`/`isError` props
- LAST SNAPSHOT KPI card: wall-clock time from `lastUpdated` state; stale (>5min) turns amber
- Station table rows: `border-l-4` status colour, status badge, utilisation bar (number + mini bar)
- Detail + Rebalancing Queue screens updated to use `statusConfig` badges + row border colours
- LOW STOCK % / UTILIZATION % KPI values colour-coded at thresholds
- Committed: `54bd392`

**Phase 2 — Full badge rename, utilisation threshold, background imagery**
- `stationStatus.ts`: `over` label renamed "Over" → "Full"
- New `src/components/BackgroundGallery.tsx`: 6 Unsplash cycling images, 20s crossfade, dot nav, dark overlay
- All 3 screens: `<BackgroundGallery>` mounted, `bg-background` removed from root div
- All 3 screens: frosted-glass content panels (`bg-background/80 backdrop-blur-sm rounded-2xl`) wrapping content
- Header: updated to frosted backdrop
- UTILIZATION % threshold colouring was already in place from Phase 1
- Committed: `c873b29`
- Deployed: https://humid-gem-4f2e8b4d0a-northeurope.webapp.fabricapps.net

### Build notes (persistent gotchas)
- `tsc` not on system PATH; use `node node_modules/typescript/bin/tsc -b <tsconfig>` for manual typecheck
- Before every `rayfin up`: rebuild shared with `--force` then data (otherwise `index.d.ts` may be missing)
  ```powershell
  $tsc = ".\node_modules\typescript\bin\tsc"
  node $tsc -b packages/shared --force
  node $tsc -b packages/data
  ```
- Pre-existing typecheck errors: `data` (TS7016 `@rayfin-app/shared`), `Welcome.tsx` (lucide-react) -- unrelated; 3 scaffold failures in Root.spec.tsx remain

### Confirmed schema -- TransformedData (Silver)
| Column | Type | Notes |
|---|---|---|
| BikepointID | int | Station ID |
| Street | string | |
| Neighbourhood | string | |
| Latitude | real | |
| Longitude | real | |
| No_Bikes | long | |
| No_Empty_Docks | long | |
| Timestamp | datetime | |
| BikesToBeFilled | long | Negative = overfull |
| Action | string | "NA" or numeric string |

### Confirmed functions
- `LatestStationSnapshot()` -- `arg_max(Timestamp, *) by BikepointID` -- 120 rows, all columns
- `TransformRawData()` -- Bronze -> Silver transform
- `AggregatedData` MV -- only 3 columns (BikepointID, Timestamp, No_Bikes) -- not suitable for chart

### Status badge logic (implemented in stationStatus.ts)
- Type key `'over'`, display label `'Full'`; `'available'` | `'low'` | `'empty'` | `'over'` | `'unknown'`
- pct < 0.2 = low; pct === 0 = empty; bikesToBeFilled < 0 = over/Full

**Phase 3 — Background image replacement (2026-10-31, same session)**
- Replaced all 6 BG_IMAGES with verified images: 3 cycling race shots (Unsplash) + 3 bike-sharing station shots (Pexels)
- All images verified visually before deploy (WebFetch + Read tool as image)
- Committed: `14d06e1`

**Phase 4 — Interactive Leaflet map (2026-10-31, same session)**
- Installed: `leaflet` + `@types/leaflet` (no API key, OpenStreetMap tiles)
- New `src/lib/mapMarkers.ts`: `createCircleMarker()` — status-coloured `L.circleMarker`, radius 8/14 (normal/selected)
- New `src/components/StationMap.tsx`: map init once (London 51.505/-0.09, zoom 12), markers rebuilt on stations/selectedId change, tooltip on hover, click fires `onSelectStation`
- `App.tsx`: `selectedStationId` state; table now scrollable (max 320px), sticky thead; row `ref` callback auto-scrolls selected row into view; map panel 360px below table
- Bidirectional sync: table row click → map pans + dot enlarges; map dot click → row highlights + scrolls into view
- Vite icon-path fix: `delete L.Icon.Default.prototype._getIconUrl` + `mergeOptions` in StationMap.tsx
- Committed: `35c53a8`, pushed, deployed

### Build notes (persistent gotchas)
- `tsc` not on system PATH; use `node node_modules/typescript/bin/tsc -b <tsconfig>` for manual typecheck
- Before every `rayfin up`: rebuild shared with `--force` then data (otherwise `index.d.ts` may be missing)
  ```powershell
  $tsc = ".\node_modules\typescript\bin\tsc"
  node $tsc -b packages/shared --force
  node $tsc -b packages/data
  ```
- Pre-existing typecheck errors: `data` (TS7016 `@rayfin-app/shared`), `Welcome.tsx` (lucide-react) -- unrelated; 3 scaffold failures in Root.spec.tsx remain
- Frontend standalone typecheck (no project refs): `node ..\..\node_modules\typescript\bin\tsc --noEmit` from `packages/frontend`

### Next session priorities
1. Browser validation — map: confirm 120 dots render, colour-coding matches badges, bidirectional sync works, tooltip shows
2. Optional: neighbourhood filter dropdown on Network Overview
3. Optional: mark-resolved flow on Rebalancing Queue (set resolvedAt)
4. Chart/sparkline: deferred -- revisit after Eventstream stability confirmed (AggregatedData MV only has 3 cols, not suitable)
