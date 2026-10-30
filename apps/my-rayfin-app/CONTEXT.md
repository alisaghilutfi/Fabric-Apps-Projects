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
- UI polish: app-design skill not yet applied
- dueDate field exists in schema but no UI yet
- No pagination (under 100 items assumed for now)
- ANTHROPIC_API_KEY secret must be provisioned on deployed backend: run `npx rayfin secret set ANTHROPIC_API_KEY` interactively from the app folder (requires interactive terminal for masked prompt)

## Last Session
2026-10-30 — functions capability added; classifyTask UDF calls Claude Haiku to classify tasks as Urgent/Non-Urgent; priority field added to TodoItem (schema v7); coloured badge shown on each row; func 4.15.2 installed via winget; commit ed99e3b
