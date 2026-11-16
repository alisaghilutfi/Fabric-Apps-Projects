# FabricApp_FabricLicenseAdvisor — Context

## Purpose
Interactive Rayfin Fabric App guiding users through Microsoft Fabric licensing decisions.
Outputs a recommended license path + monthly cost estimate.
Target: Fabric admins, consultants, BI managers evaluating Fabric.
Gallery submission target: Fabric Apps Gallery.

## Screens
| Screen | Route | Status |
|---|---|---|
| LicenseWizard | / | Live — 3-step decision wizard, all paths implemented |
| CostEstimator | /estimate | Live — PAYG vs Reserved calculator |
| SkuReference | /skus | Live — full SKU table from sm_FabricLicenseAdvisor |
| BreakEven | /breakeven | Live — F64 break-even calculator vs Pro and PPU; interactive org-size slider |

## DAX gotchas
- `SORT()` is NOT a valid DAX table function. Use `TOPN(999, <table>, <col>, ASC)` to sort a full table.
- Column names in raw `EVALUATE` results are prefixed with the table name (`pricing_sku sku`). Use `SELECTCOLUMNS` with explicit string aliases to get clean names.

## Data
- Workspace: ws_FabricLicenseAdvisor_Dev (ID: 9629e4d5-9acb-499e-b936-1fd7a3b0241d)
- Semantic model: sm_FabricLicenseAdvisor (ID: 19433fad-1ba4-4f6d-b7d1-5f8c77827ca9)
- Lakehouse: lh_pricing — tables: pricing_sku (13 rows), pricing_user_licenses (3 rows), pricing_storage (2 rows)

## Deployment
- **Live URL:** https://brief-fawn-30a395c0ef-northeurope.webapp.fabricapps.net
- **Rayfin Item ID:** `17b217db-4e21-430a-a533-5aa99cc39a2d`
- **Rayfin item name:** `fabricapp-fabriclicenseadvisor`
- **Fabric Workspace (backend):** `b23af3d8-bda7-4a5f-822f-ba900bd4fde5`

## Repo
- App code: Fabric-Apps-Projects/apps/FabricApp_FabricLicenseAdvisor/
- Workspace items: Fabric-Analytics-Projects/ws_FabricLicenseAdvisor_Dev/

## Last Session
**Date:** 2026-11-16

**What was done:**
- Scaffolded FabricApp_FabricLicenseAdvisor from scratch (blankapp template, mssql dialect, data.enabled).
- Implemented all 4 screens to production quality:
  - SkuReference (/skus) — full SKU table from sm_FabricLicenseAdvisor, sorted by CUs ASC via TOPN DAX pattern.
  - CostEstimator (/estimate) — interactive PAYG vs Reserved calculator; SKU dropdown + per-license-type user count inputs; live monthly and annual saving comparison.
  - BreakEven (/breakeven) — F64 (dynamic pivot: lowest SKU with free viewers) break-even calculator vs Pro and PPU; interactive org-size slider with three-state verdict.
  - LicenseWizard (/) — 3-step decision wizard (default route); paths for view-only, content creators, and Fabric workload users; live SKU and license data from semantic model.
- Created use-semantic-model-query.ts hook (not in scaffold).
- Fixed DAX bug mid-session: SORT() is not a valid DAX table function; replaced with TOPN(999, ...) pattern.
- Documented DAX gotchas in CONTEXT.md (SORT vs TOPN; raw EVALUATE column name prefix issue requires SELECTCOLUMNS with string aliases).
- Deployed live at https://brief-fawn-30a395c0ef-northeurope.webapp.fabricapps.net. All changes committed to main (last commit bcb4230).

**Current state:**
All 4 screens are live and functional. App reads live pricing data from sm_FabricLicenseAdvisor (workspace ws_FabricLicenseAdvisor_Dev). No open blockers.

**Next development:**
Gallery submission preparation — review copy, accessibility, and mobile layout. Consider adding a /compare route for side-by-side SKU comparison.
