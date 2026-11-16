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
| BreakEven | /breakeven | Scaffolded — logic pending |

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
