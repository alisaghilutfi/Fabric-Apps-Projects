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

## Last Session -- 2026-10-31 (evening)

### What was done
- Phase 5a -- KPI card polish: new `KpiCard` component with lucide icons, top border accent colours, semantic value colouring (`41221bf`)
- Phase 5b -- Sparkline chart: `SparklineChart.tsx` using recharts AreaChart, blue gradient, polls every 30s (`41221bf`)
- Phase 5c -- Semantic model update: `Station History` DirectQuery table added to `sm_RTI_BicycleRentals` via powerbi-modeling-mcp; KQL partition pre-aggregates to 15min bins (`77c80e2`)
- App is demo-ready for Nov 19

### Current state
- All 5 phases complete and deployed
- Live URL: https://humid-gem-4f2e8b4d0a-northeurope.webapp.fabricapps.net
- Eventstream deactivated after session
- F2 capacity paused

### Architecture confirmed
- Poll query: `LatestStationSnapshot()` every 30s
- Sparkline query: `EVALUATE 'Station History'` DAX against `sm_RTI_BicycleRentals` every 30s
- Status logic: `getStationStatus()` in `stationStatus.ts`
- Map: Leaflet + OSM, `createCircleMarker()` in `mapMarkers.ts`
- Background gallery: 6 images (3 race, 3 bike-station), 20s crossfade

### Next development (post-demo)
- Mark-resolved flow on Rebalancing Queue
- Neighbourhood filter dropdown on Network Overview
- `rpt_RTI_BicycleRentals` report (blocked on Trial capacity -- manifest 404)

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
