# Projects

| App | Workspace | Status | Live URL | Rayfin Item ID |
|-----|-----------|--------|----------|----------------|
| FabricApp_USGS_Earthquake | ws_USGS_Earthquake | 🟢 Live — All 3 screens complete. Search (animated seismograph bg), Results (Zone 1 animated header + KPI cards; Zone 2 table + Leaflet/OSM map over pure-CSS photo slideshow bg — 4 images crossfade every 5 s), Subscribe (AlertSubscription write). | https://daily-cave-2c1879b505-northeurope.webapp.fabricapps.net | 22fd172f-f5d6-4765-a353-86e42f64782f |
| FabricApp_RTI_BicycleRentals | ws_RTI_BicycleRentals | 🟢 Live — All 5 phases complete. KPI cards, sparkline, map, badges, live poll deployed. Eventstream deactivated. Post-demo: mark-resolved flow, neighbourhood filter, rpt_ report. Auth: external Entra accounts supported; workspace Viewer role required for DAX connector. | https://humid-gem-4f2e8b4d0a-northeurope.webapp.fabricapps.net | 3d942f93-b1f3-4e01-abf8-e664b0ff969b |
| my-rayfin-app | ws_FabricApps | 🟢 Live | https://lucid-iris-65e5e06ded-northeurope.webapp.fabricapps.net | af9bbcd3-57c2-469c-a513-18c5ce89f854 |
| FabricApp_Governance | ws_Governance_Dev | 🟢 Active — UI enhancements live (score histogram, rule frequency chart, rule summary table added 2026-11-05). Connector stale-ID bug fixed for both Governance and RTI. Blockers: none app-side. Next session: data quality fixes in Fabric-Analytics-Projects (NO_SENSITIVITY_LABEL severity, items population, git_connected). | https://hefty-pearl-60b5367c54-northeurope.webapp.fabricapps.net | 8c9b81da-3e15-4d38-a325-22a6c06ef526 |

## Status key
- 🟢 Live — deployed, frontend complete
- 🟡 Learning — backend deployed, frontend in progress
- 🔴 Blocked — see CONTEXT.md for details

## Repo harness — implementation waves

| Wave | Item | Commit | Completed |
|------|------|--------|-----------|
| 3 | B4 — dev-environment pre-commit hook | 9ffe10a (dev-environment main) | 2026-11-10 |
| 3 | D5 — Fabric-Apps pre-commit hook + grep variable fix | f193ff3, a6b9846 (main) | 2026-11-10 |
