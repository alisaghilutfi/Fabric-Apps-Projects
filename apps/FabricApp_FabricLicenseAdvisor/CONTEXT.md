# FabricApp_FabricLicenseAdvisor — Context

## Purpose
Interactive Rayfin Fabric App guiding users through Microsoft Fabric licensing decisions.
Outputs a recommended license path + monthly cost estimate.
Target: Fabric admins, consultants, BI managers evaluating Fabric.
Gallery submission target: Fabric Apps Gallery.

## Screens
| Screen | Route | Status |
|---|---|---|
| LicenseWizard | / | Scaffolded — logic pending |
| CostEstimator | /estimate | Scaffolded — logic pending |
| SkuReference | /skus | Scaffolded — logic pending |
| BreakEven | /breakeven | Scaffolded — logic pending |

## Data
- Workspace: ws_FabricLicenseAdvisor_Dev (ID: 9629e4d5-9acb-499e-b936-1fd7a3b0241d)
- Semantic model: sm_FabricLicenseAdvisor (ID: 19433fad-1ba4-4f6d-b7d1-5f8c77827ca9)
- Lakehouse: lh_pricing — tables: pricing_sku (13 rows), pricing_user_licenses (3 rows), pricing_storage (2 rows)

## Repo
- App code: Fabric-Apps-Projects/apps/FabricApp_FabricLicenseAdvisor/
- Workspace items: Fabric-Analytics-Projects/ws_FabricLicenseAdvisor_Dev/
