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
| lh_usgs_earthquake | fabric-sqlanalytics | schema.ts placeholder only; TDS port 1433 blocked from dev machine |

## Semantic Model (sm_USGS_Earthquake)
- Item ID: 856acf3d-ddbc-4ed7-87a8-559018c12f05
- Mode: Direct Lake on earthquake_events_gold + DateDimension
- 17 DAX measures across Magnitude / Significance / Time / Time Intelligence / Volume folders

## App Design -- 3 Screens
- Search: country autocomplete (75 countries), seismograph SVG background
- Results: KPI cards (Total Earthquakes, Avg/Max Magnitude, High Significance %)
  via EVALUATE ROW(...), earthquake list via TOPN/FILTER
- Subscribe: AlertSubscription entity (alert preferences)

## AlertSubscription Entity
Fields: stationId (int), street, neighbourhood, action, flaggedAt, resolvedAt (optional), userId

## Open Items
- Lakehouse SQL connector: retain or remove lh_usgs_earthquake from rayfin.yml (TDS port blocked)
- Root.spec.tsx: no known failures at last deploy
- Pipeline schedule: pl_USGS_Earthquake runs on demand only; Gold table grows stale between runs
