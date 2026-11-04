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
  (`2514647e-c2a4-4eee-984a-e26da08dccd0` logical / `0d12fbd0-4564-4d2d-b9a9-3f3e5fc647a8` item)

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Tenant Health Overview | default | 4 KPI cards, horizontal bar chart sorted worst-first, workspace table with clickable rows |
| Workspace Detail | drill-down | Header card (name, score, state, admins, git badge), Violations tab (severity badge, ruleId, detail), Items tab (name, type, lastActivityDate) |
| Violations Explorer | nav link | Flat violations table, severity filter (All/High/Medium/Low), Export CSV |

## Last Session — 2026-11-04

- App scaffolded from `blankapp` template in `ws_Governance_Dev`
- Packs applied: `connectors`, `analytics`, `visuals`
- Connector added via `rayfin connector add` using real item ID (logical ID in brief was wrong — resolved via Fabric Core MCP)
- 3 screens built: Tenant Health Overview (KPI cards, bar chart, workspace table), Workspace Detail (header card, Violations tab, Items tab), Violations Explorer (flat violations table, severity filter, Export CSV)
- Styling: Tailwind + Segoe UI design tokens, identical to FabricApp_RTI_BicycleRentals global.css
- Pre-deploy gates: tsc PASS, build PASS (chunk advisory only), lint PASS, 67/67 tests PASS
- Root.spec.tsx heading assertions updated from scaffold placeholder to "Tenant Health Overview"
- Deployed: https://hefty-pearl-60b5367c54-northeurope.webapp.fabricapps.net
- App backend ID: `8c9b81da-3e15-4d38-a325-22a6c06ef526`
- Smoke test passed: KPI cards (28 workspaces, 40.5 avg score, 1588 critical violations, 25 single-admin workspaces), bar chart sorted worst-first, drill-down to Workspace Detail, Violations Explorer with severity filters working

## Open Items

### Known data issues (fix in Fabric-Analytics-Projects, not this repo)

1. **Items tab shows 0 rows** — Scanner API depth limitation; `gold_items` not populated for most workspaces
2. **git_connected shows "No Git" for most workspaces** — Scanner field not reliably populated
3. **NO_SENSITIVITY_LABEL dominates violations** — drives all health scores to 0; consider down-weighting that rule or separating it from the score

### UI enhancements (next session, after data quality fixed)

- Score distribution histogram (how many workspaces fall in each band)
- Violation breakdown chart (rule frequency across tenant)
- Rule frequency table in Violations Explorer
