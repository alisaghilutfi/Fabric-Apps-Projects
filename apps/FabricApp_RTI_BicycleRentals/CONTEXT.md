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

## Last Session -- 2026-10-30

### What was done
- Diagnosed and fixed `fabric-rti-mcp` connection for Claude Code
  - Correct registration file: `~/.claude.json` (mcpServers key)
  - Registered without `--use-obo-flow` (requires CLIENT_ID/SECRET -- not available)
  - Granted `Fabric-VSCode-MCP` SP (`81339ad5-15a6-4740-adee-c7a3efdcf1a7`) Read access on `eh_RTI_BicycleRentals` Eventhouse
  - Auth: server uses DefaultAzureCredential -- `az login` must run BEFORE Claude Code starts
- Ran full schema investigation (Q1-Q7) against Eventhouse

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
- `LatestStationSnapshot()` -- `arg_max(Timestamp, *) by BikepointID` -- 120 rows, all columns -- **use this for the live poll query**
- `TransformRawData()` -- Bronze -> Silver transform
- `AggregatedData` MV -- only 3 columns (BikepointID, Timestamp, No_Bikes) -- **not suitable for chart**

### Status badge logic (confirmed)
```typescript
// Action is string: "NA" when BikesToBeFilled <= 0, numeric string otherwise
// BikesToBeFilled is long: negative = overfull
function getStatus(bikes: number, emptyDocks: number, bikesToBeFilled: number | null) {
  const capacity = bikes + emptyDocks;
  if (capacity === 0) return 'unknown';
  if (bikesToBeFilled !== null && bikesToBeFilled < 0) return 'over';
  const pct = bikes / capacity;
  if (pct === 0) return 'empty';
  if (pct < 0.2) return 'low';
  return 'available';
}
```

### Critical blocker -- Eventstream stopped
- Last ingestion: 2026-10-22 (~8 days stale)
- `rowsLast1h = 0`, `rowsLast24h = 0`
- **Must restart Eventstream before any frontend polling work is meaningful**
- Portal showed "Capacity delays" -- likely cause

### Next session priorities
1. Restart Eventstream -> verify `rowsLast1h > 0`
2. Implement status badges using `LatestStationSnapshot()` query
3. Implement 30s auto-poll
4. Add live indicator dot to header
5. Chart decision: drop for now; add Option B sparkline only after stream confirmed live
