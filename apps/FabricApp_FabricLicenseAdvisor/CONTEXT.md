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
**Date:** 2026-11-18

**What was done:**
- Implemented Fabric logo watermark background (body::before, position: fixed, opacity 0.50) using the official fabric_24_color icon extracted from the Microsoft sprite sheet (product-color-icons.*.svg).
- Prepared and submitted app to Fabric Apps Gallery: animated GIF cover (4-frame, all four screens) + 3 JPG screenshots; description reviewed and finalised with ProjectPlanner; tagged OTHER.
- Gallery assets committed to docs/images/.
- Bumped watermark opacity through four fix commits (0.13 -> 0.20 -> 0.30 -> 0.50) to reach final approved value.
- Added app-level README (apps/FabricApp_FabricLicenseAdvisor/README.md) with gallery link, animated GIF embed, screens table, and stack summary.
- Updated root README.md portfolio table and app section to include gallery URL.

**Current state:**
App is live and gallery submission is pending approval. All 4 screens functional. Watermark, gallery assets, and app README in repo.

**Next development:**
- Monitor Fabric Apps Gallery for approval/publication.
- Optional: /compare route for side-by-side SKU comparison.
