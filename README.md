# Fabric Apps Projects

Portfolio of Microsoft Fabric Apps built by [Ali Saghi](https://www.linkedin.com/in/ali-saghi-fabric/),
DP-600 certified Microsoft Fabric Analytics Engineer and founder of
[Lotusoftware](https://lotusoftware.hashnode.dev) — a data analytics consultancy in Vantaa, Finland.

Each app demonstrates a full Fabric App workload: live data connectors, semantic model queries,
write-back flows, and real-time UI — all built using a two-harness agentic workflow with no manual
work in the Fabric portal.

Companion repo: [Fabric-Analytics-Projects](https://github.com/alisaghilutfi/Fabric-Analytics-Projects)

---

## How This Works

This repo is the **execution harness** of a two-harness agentic system. The planning harness
(Claude Desktop / ProjectPlanner) reads business context and writes session instructions. The
execution harness (Claude Code + Fabric MCP servers + Rayfin CLI) reads those instructions,
scaffolds and deploys the app, and files a recap at session end — no manual work in the Fabric
portal.

```
ProjectPlanner (claude.ai)          FabricEngineer (Claude Code)
        │                                      │
        │  writes session instructions         │
        ▼                                      │
  CONTEXT.md ───────────────────────────────▶ │ reads at session start
        │                                      │
        │                           executes scaffold, build, deploy
        │                                      │
        │◀─────────────────── recap ───────────┘
        │
  PROJECTS.md ◀──────── updates status
```

The planning agent (Claude Desktop) writes session instructions into `CONTEXT.md`; the execution
agent (Claude Code + Fabric MCP servers + Rayfin CLI) implements them — no manual work in the
Fabric portal. See [HARNESS.md](./HARNESS.md) for the full workflow.

---

## Apps

| App | Focus | Status |
|-----|-------|--------|
| FabricApp_RTI_BicycleRentals | **Start here** — real-time operational loop: live DirectQuery semantic model over KQL Eventhouse, write-back rebalancing queue, 30s auto-poll | 🟢 Live |
| FabricApp_Governance | Tenant-wide Fabric governance — workspace inventory, health scoring across 8 rules (Scanner API + Activity Events), usage patterns, Git connection status | 🟢 Live — MVP |
| FabricApp_USGS_Earthquake | Global seismic search and analytics over live USGS API, batch pipeline to Lakehouse Gold layer | 🟢 Live |

### FabricApp_RTI_BicycleRentals

**Type:** Real-Time Intelligence  
**Stack:** KQL Eventhouse (187M rows) · DirectQuery semantic model · AlertSubscription write-back · Rayfin Fabric App  
**Live:** https://humid-gem-4f2e8b4d0a-northeurope.webapp.fabricapps.net

Real-time operational monitoring of a bicycle rental network. KPI cards, station availability table,
station drill-down, and write-back rebalancing queue. 30-second auto-poll keeps the view live.
Semantic model runs DirectQuery against the Eventhouse KQL database; queries execute under the
signed-in user's delegated identity.

---

### FabricApp_Governance

**Type:** Tenant Governance  
**Stack:** Power BI Admin APIs (Scanner, Activity Events, Refresh History) · Medallion Lakehouse · DirectLake semantic model · Rayfin Fabric App  
**Live:** https://hefty-pearl-60b5367c54-northeurope.webapp.fabricapps.net

Tenant-wide governance and asset inventory: 3 screens (Tenant Health Overview, Workspace Detail,
Violations Explorer), 28 workspaces scored across 8 health rules covering ownership, sensitivity
labelling, refresh reliability, and Git connection status.

---

### FabricApp_USGS_Earthquake

**Type:** Data Engineering + Analytics  
**Stack:** REST API ingestion · Medallion Lakehouse · PySpark · reverse_geocoder · DirectLake semantic model · Rayfin Fabric App  
**Live:** https://daily-cave-2c1879b505-northeurope.webapp.fabricapps.net

Global seismic search over the live USGS API. Country search, DAX-bound KPI cards, earthquake list,
and alert subscriptions. Bronze/Silver/Gold Lakehouse pipeline with reverse geocoding and significance
classification.

---

## Access & Authentication

Apps require a Viewer invite to the relevant Fabric workspace.
Request access before the demo: ali.saghi.2015@gmail.com

| App | Workspace | Live URL |
|-----|-----------|----------|
| FabricApp_RTI_BicycleRentals | ws_RTI_BicycleRentals | https://humid-gem-4f2e8b4d0a-northeurope.webapp.fabricapps.net |
| FabricApp_Governance | ws_Governance_Dev | https://hefty-pearl-60b5367c54-northeurope.webapp.fabricapps.net |
| FabricApp_USGS_Earthquake | ws_USGS_Earthquake | https://daily-cave-2c1879b505-northeurope.webapp.fabricapps.net |

All apps require Microsoft sign-in (`externalEntraExchange: true`). Delegated connectors run DAX
queries under the signed-in user's identity, so the Viewer role on the workspace is required — not
just for data access but for the connector auth model.

---

## Stack

| Layer | Tool |
|---|---|
| AI planning agent | Claude Desktop (ProjectPlanner) |
| AI execution agent | Claude Code in VS Code (FabricEngineer) |
| App framework | Rayfin SDK / CLI (@microsoft/rayfin-cli@1.36.0-alpha) |
| Fabric operations | Fabric Core MCP Server (remote connector) |
| Runtime | Node.js v24.18.0 · TypeScript |
| Capacity | Microsoft Fabric North Europe, F2 |
| Context management | PROJECTS.md + apps/\<AppName\>/CONTEXT.md |

## Branch Strategy

`main` only. Apps deploy via `npx rayfin up`. No dev/test chain — live state is what `rayfin up`
deployed.

## Session Discipline

- ProjectPlanner (claude.ai): architecture, entity design, `@role` policy design, session planning. Never executes.
- FabricEngineer (Claude Code): scaffold, file edits, builds, deploys, Git. Never makes architectural decisions without ProjectPlanner input.
- End of session: FabricEngineer updates PROJECTS.md and root README.md.

See [HARNESS.md](./HARNESS.md) for CLI commands, connector patterns, and deploy sequence.

---

## Learning Exercises

| App | Notes |
|-----|-------|
| my-rayfin-app | blankapp scaffold tutorial — not representative of the portfolio. |

---

## About Lotusoftware

Lotusoftware is a data analytics consultancy founded by Ali Saghi in Vantaa, Finland,
specialising in Microsoft Fabric, Power BI, and agentic analytics systems.

- Blog: [lotusoftware.hashnode.dev](https://lotusoftware.hashnode.dev)
- LinkedIn: [ali-saghi-fabric](https://www.linkedin.com/in/ali-saghi-fabric/)
- GitHub: [alisaghilutfi](https://github.com/alisaghilutfi)
- X: [@alis05111](https://x.com/alis05111)

*Last updated: 2026-11-05.*
