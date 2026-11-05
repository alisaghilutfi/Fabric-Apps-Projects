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
| Tenant Health Overview | default | 4 KPI cards, score distribution histogram, rule frequency chart, horizontal bar chart sorted worst-first, workspace table with clickable rows |
| Workspace Detail | drill-down | Header card (name, score, state, admins, git badge), Violations tab (severity badge, ruleId, detail), Items tab (name, type, lastActivityDate) |
| Violations Explorer | nav link | Rule summary table (ruleId, severity, count), flat violations table, severity filter (All/High/Medium/Low), Export CSV |

## Last Session — 2026-11-05

- Added 3 UI enhancements to App.tsx:
  1. **Score Distribution Histogram** — 5 bands (0–19, 20–39, 40–59, 60–79, 80–100), computed from loaded workspaces array, no new DAX query, horizontal bars colored red/amber/green by band
  2. **Top Violations by Rule chart** — horizontal bar chart of top 10 rules by violation count, new DAX query against `gold_health_rule_results`, bars colored by severity
  3. **Rule Summary Table** — compact summary in Violations Explorer above flat violations list, grouped by rule_id + severity, sorted by count descending
- Connector "not declared" error root cause identified and fixed: stale logical ID (`2514647e-...`) registered on backend from prior deploy; fixed by `npx rayfin connector add --yes` with correct item ID (`0d12fbd0-...`) then `npx rayfin up`
- Same fix applied to FabricApp_RTI_BicycleRentals connector
- Local dev verification blocked by persistent connector error on localhost — all verification done on live URL instead
- Live smoke test passed: all 3 enhancements render with real data
- Pre-deploy gates: tsc PASS, build PASS, lint PASS, 67/67 tests PASS
- Commits: `78bab8e` (feat enhancements), `c6d48d5` (docs), `cf50f14` (HARNESS.md gotcha)

## Open Items

### Known data issues (fix in Fabric-Analytics-Projects, not this repo)

1. **Items tab shows 0 rows** — Scanner API depth limitation; `gold_items` not populated for most workspaces
2. **git_connected shows "No Git" for most workspaces** — Scanner field not reliably populated
3. **NO_SENSITIVITY_LABEL dominates violations** — drives all health scores to 0; consider down-weighting that rule or separating it from the score

### Local dev environment

- **`rayfin dev` connector error** — investigate whether dev session can be made to work without requiring `rayfin up` first; may be an SDK issue with how runtime config is seeded on first deploy

### UI enhancements (future)

- Pagination or virtual scrolling for large violation lists
- Score trend over time (requires time-series data in gold layer)
- Workspace search/filter on the Overview table
