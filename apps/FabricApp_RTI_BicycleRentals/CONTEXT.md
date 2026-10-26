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
