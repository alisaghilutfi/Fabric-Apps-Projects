# FabricApp_Governance — Context

## App overview

Governance health dashboard surfacing workspace scores, violation drill-down,
and a flat violations explorer against `sm_Governance` in `ws_Governance_Dev`.
Read-only — no Rayfin SQL database.

## Deployment

- **Live URL:** https://hefty-pearl-60b5367c54-northeurope.webapp.fabricapps.net
- **App backend ID:** `8c9b81da-3e15-4d38-a325-22a6c06ef526`
- **Rayfin item ID:** `fabricapp-governance`
- **Workspace:** `ws_Governance_Dev` (`7ea6403c-9364-4cd5-94c3-3ba6fcfce918`)
- **Connector:** `sm_governance` → `sm_Governance`
  (item ID in rayfin.yml: `0d12fbd0-4564-4d2d-b9a9-3f3e5fc647a8` — this is what Rayfin resolves; logical ID `2514647e-c2a4-4eee-984a-e26da08dccd0` is rejected by the backend)

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Tenant Health Overview | default | 4 KPI cards, horizontal bar chart sorted worst-first, workspace table with clickable rows |
| Workspace Detail | drill-down | Header card (name, score, state, admins, git badge), Violations tab (severity badge, ruleId, detail), Items tab (name, type, lastActivityDate) |
| Violations Explorer | nav link | Flat violations table, severity filter (All/High/Medium/Low), Export CSV |

## Last Session — 2026-11-05

- Added score distribution histogram to Overview (5 bands, computed from loaded workspaces, red/amber/green)
- Added top-10 rule frequency horizontal bar chart to Overview (new SUMMARIZECOLUMNS DAX query, colored by severity)
- Added rule summary table to Violations Explorer (grouped by ruleId+severity, sorted by count desc, no new query)
- Fixed connector registration: backend had stale logical ID `2514647e-...` from prior deploy; re-registered with `--yes` using item ID `0d12fbd0-...` and redeployed both Governance and RTI apps
- Pre-deploy gates: tsc PASS, build PASS, lint PASS, 67/67 tests PASS
- Deployed: https://hefty-pearl-60b5367c54-northeurope.webapp.fabricapps.net
- Commit: 78bab8e

## Open Items

### Known data issues (fix in Fabric-Analytics-Projects, not this repo)

1. **Items tab shows 0 rows** — Scanner API depth limitation; `gold_items` not populated for most workspaces
2. **git_connected shows "No Git" for most workspaces** — Scanner field not reliably populated
3. **NO_SENSITIVITY_LABEL dominates violations** — drives all health scores to 0; consider down-weighting that rule or separating it from the score

### UI enhancements (next session)

- Pagination or virtual scrolling for large violation lists
- Score trend over time (requires time-series data in gold layer)
- Workspace search/filter on the Overview table
