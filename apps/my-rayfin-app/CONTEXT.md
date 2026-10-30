# FabricApp — my-rayfin-app

## App Info
- Workspace: ws_FabricApps (ID: 3efadebe-9c4b-48b2-8e04-558964bdfb7d)
- Rayfin item ID: af9bbcd3-57c2-469c-a513-18c5ce89f854
- Live URL: https://lucid-iris-65e5e06ded-northeurope.webapp.fabricapps.net
- Purpose: Learning app — full Rayfin surface exploration
- Stack: blankapp template, React + Vite, Tailwind v4, Fabric SSO

## Data Model
- `TodoItem` entity: id (uuid), ownerId (text max:255), title (text min:1 max:200), isCompleted (boolean), priority (text max:20 optional), createdAt (date), dueDate (date optional)
- `@role`: authenticated owner-only on all CRUD via `claims.sub.eq(item.ownerId)`
- Schema version: 7 (last applied 2026-10-30)

## Key Files
- `packages/data/src/TodoItem.ts` — entity + @role
- `packages/data/src/index.ts` — schema registration
- `packages/shared/src/index.ts` — UniversalAppSchema (TodoItemRecord interface)
- `packages/frontend/src/TodoList.tsx` — main UI (list, create, toggle, delete, priority badge)
- `packages/frontend/src/components/useCrud.ts` — CRUD hook from crud-ui kit
- `packages/frontend/src/lib/rayfin-client.ts` — RayfinClient typed with AppFunctionsSchema
- `packages/functions/src/function_app.ts` — classifyTask UDF (Claude Haiku classification)
- `packages/functions/src/types.ts` — generated AppFunctionsSchema (do not edit)
- `rayfin/rayfin.yml` — services config (auth: Fabric SSO only, data: enabled, dialect: mssql, functions: enabled)

## Open Items
- No pagination (under 100 items assumed for now)
- Old test tasks in the database — consider a clear-all or filter for completed items

## Last Session
2026-10-30 (session 2) — UI polish rewrite: header bar + theme toggle, dueDate UI in create form, Trash2 icon, completed-items show/hide filter, UTC-safe date formatting; background picker (6 colour swatches + 6 Unsplash nature photos, localStorage); 600ms completion linger before items disappear; semi-transparent overlays when image background active; py-[2px]/mt-[3px] replacing custom spacing tokens; commits 23d41a0, 0307624
