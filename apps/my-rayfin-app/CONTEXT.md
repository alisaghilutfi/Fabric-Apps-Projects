# FabricApp — my-rayfin-app

## App Info
- Workspace: ws_FabricApps (ID: 3efadebe-9c4b-48b2-8e04-558964bdfb7d)
- Rayfin item ID: af9bbcd3-57c2-469c-a513-18c5ce89f854
- Live URL: https://lucid-iris-65e5e06ded-northeurope.webapp.fabricapps.net
- Purpose: Learning app — full Rayfin surface exploration
- Stack: blankapp template, React + Vite, Tailwind v4, Fabric SSO

## Data Model
- `TodoItem` entity: id (uuid), ownerId (text max:255), title (text min:1 max:200), isCompleted (boolean), createdAt (date), dueDate (date optional)
- `@role`: authenticated owner-only on all CRUD via `claims.sub.eq(item.ownerId)`
- Schema version: 3 (last applied 2026-10-29)

## Key Files
- `packages/data/src/TodoItem.ts` — entity + @role
- `packages/data/src/index.ts` — schema registration
- `packages/shared/src/index.ts` — UniversalAppSchema (TodoItemRecord interface)
- `packages/frontend/src/TodoList.tsx` — main UI (list, create, toggle, delete)
- `packages/frontend/src/components/useCrud.ts` — CRUD hook from crud-ui kit
- `rayfin/rayfin.yml` — services config (auth: Fabric SSO only, data: enabled, dialect: mssql)

## Open Items
- UI polish: app-design skill not yet applied
- dueDate field exists in schema but no UI yet
- No pagination (under 100 items assumed for now)

## Last Session
2026-10-29 — TodoList UI built and deployed; strikethrough fix on completed items; UniversalAppSchema wired; commits 691addf, c291685, latest strikethrough fix
