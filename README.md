# Fabric-Apps-Projects

Portfolio of Microsoft Fabric Apps built with the Rayfin SDK.

| App | Workspace | Status | Live URL |
|-----|-----------|--------|----------|
| FabricApp_USGS_Earthquake | ws_USGS_Earthquake | 🟢 Live | https://daily-cave-2c1879b505-northeurope.webapp.fabricapps.net |
| FabricApp_RTI_BicycleRentals | ws_RTI_BicycleRentals | 🟢 Live — interactive Leaflet map, status badges, 30s auto-poll, background gallery | https://humid-gem-4f2e8b4d0a-northeurope.webapp.fabricapps.net |
| my-rayfin-app | ws_FabricApps | 🟡 Learning | https://lucid-iris-65e5e06ded-northeurope.webapp.fabricapps.net |

## Access & Authentication

All three apps require Microsoft sign-in (`externalEntraExchange: true` in `rayfin.yml`). Any Microsoft/Entra account works — work, school, or personal outlook.com — the apps are not restricted to the `alisaghi2015gmail.onmicrosoft.com` tenant.

| App | Extra access requirement |
|-----|--------------------------|
| FabricApp_RTI_BicycleRentals | Viewer role on `ws_RTI_BicycleRentals` — required for the delegated semantic model connector (DAX queries run under the signed-in user's identity) |
| FabricApp_USGS_Earthquake | Viewer role on `ws_USGS_Earthquake` — same reason |
| my-rayfin-app | None — uses Rayfin SQL only; any Microsoft account suffices |

To grant access for a demo: invite the attendee to the relevant Fabric workspace as Viewer before the session.

## Stack
- Rayfin SDK / CLI (@microsoft/rayfin-cli@1.36.0-alpha)
- Node.js v24.18.0
- TypeScript
- Microsoft Fabric (North Europe, F2 capacity)

## Branch strategy
`main` only. Apps deploy via `npx rayfin up`.
