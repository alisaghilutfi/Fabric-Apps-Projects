# Fabric Apps (Rayfin) — Harness Reference

This document captures the workflow, tooling, and hard-won lessons for
building Fabric Apps with the Rayfin SDK. Read it at the start of any
session before making decisions about architecture or tooling.

---

## The Two-Harness System

```
ProjectPlanner (claude.ai)          FabricEngineer (Claude Code)
         │                                    │
         │  writes next-step instructions     │
         ▼                                    │
   PROJECTS.md ──────────────────────────────▶ │ reads at session start
         │                                    │
         │                          executes scaffold / deploy / Git
         │                                    │
         │◀────────────────── updates status ─┘
```

**ProjectPlanner** (claude.ai) — architecture, entity design, `@role`
policy design, session planning. Never executes.

**FabricEngineer** (Claude Code) — scaffold, file edits, builds,
deploys, Git operations. Never makes architectural decisions without
ProjectPlanner input.

**Context files are the handoff mechanism.** There is no per-app
CONTEXT.md — `HARNESS.md` and the app's `README.md` serve that role.
`PROJECTS.md` is the portfolio-wide status registry maintained by agents.

**`rayfin up` is the execution boundary.** It is to Fabric Apps what
`git push` is to code — it provisions or updates the live Fabric items
(SQL child, Functions, app URL). Do not treat a file edit as a deploy
until `rayfin up` has run.

---

## Session Protocols

### Pre-session (ProjectPlanner)

Run this in claude.ai **before** starting a FabricEngineer session.

```
Read these two files in order:
1. HARNESS.md — read in full
2. PROJECTS.md — find the app block for the target app

Then state:
- Current app status in 3-5 bullets (what is live, what is pending, any blockers)
- The next concrete step FabricEngineer should execute

Do not propose any changes to HARNESS.md or PROJECTS.md here —
that is FabricEngineer's job at end-of-session.
```

---

### Start-of-session (FabricEngineer)

```
Read these files in order:
1. HARNESS.md — read in full
2. PROJECTS.md — find the app block for the target app
3. apps/<AppName>/README.md — read in full

Then:
1. State current app status in 3-5 bullets
   (what is live, what is broken, what is pending)
2. State any hard blockers that prevent work
3. Confirm the next step — do not invent a new step unless
   PROJECTS.md is empty for this app or a blocker makes it impossible

Do not begin any execution until I confirm the proposed step.
```

---

### End-of-session (FabricEngineer)

```
Session is complete. Update the project docs as follows:

1. In PROJECTS.md:
   - Update the app status line and open items. Remove done items.

2. In README.md (repo root):
   - If a new app was added this session, add its entry to the
     Projects section following the existing style.
   - If an existing app changed status, update its entry.
   - Do not rewrite entries that did not change.

Then commit to main with a conventional commit message.
```

---

## Git & Deploy Strategy

- Commit directly to `main` (no dev/test chain — live state is what `rayfin up` deployed)
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:` etc.)
- `rayfin up` is the deploy boundary — it is to Fabric Apps what `git push` is to code
- **Never commit:** `rayfin/.env`, `rayfin/.temp/`, `.env.local`, `node_modules/`, `dist/`
- **DO commit:** `rayfin/.deployments.json`, `rayfin/.lockfile.json`, `rayfin/.project.json` (deployment state, not secrets)

---

## MCP & Plugins Configuration

- **Fabric App pane:** run `/tui fullscreen` then `/fabric-app-pane C:\Users\alisa\DS-ML-DL\Fabric-Apps-Projects\apps` at session start — this is already wired in `CLAUDE.md` as a startup instruction
- **skills-for-fabric v0.3.19:** `powerbi-authoring` and `fabric-skills` plugins loaded at user scope; both MCP servers connect at session start
- **Session startup checklist:**
  - CLAUDE.md startup instruction launches the app pane automatically
  - F2 capacity must be running before `rayfin up` or `npx rayfin up db apply`
  - Remind to pause F2 capacity at session end

---

## Repo Structure

```
Fabric-Apps-Projects/
├── apps/
│   └── <AppName>/         ← one folder per app (scaffold lives here)
├── shared/components/     ← shared UI components (when patterns stabilize)
├── _archive/
├── HARNESS.md             ← this file
├── PROJECTS.md            ← status board
└── README.md              ← portfolio table
```

---

## Scaffold & CLI

```bash
# Create new app (run from repo root — then move to apps/)
npm create @microsoft/rayfin@latest    # canonical form per MS docs

# IMPORTANT: scaffold lands at repo root, not apps/
# Move immediately after:
Move-Item -Path "AppName" -Destination "apps\AppName"

# Deploy (run from inside the app folder)
npx rayfin up                  # full deploy — must run first on any fresh app
npx rayfin up db apply         # schema-only (only works after rayfin up has run once)
npm run dev                    # local dev (Vite at localhost:5173)
```

**CLI version:** `@microsoft/rayfin-cli@1.36.0-alpha`
**Node.js:** v24.18.0
**Fabric region:** North Europe, F2 capacity

---

## Templates

| Template | Data folder | Auth default | Use for |
|---|---|---|---|
| `blankapp` | None — `data.enabled: false` | Fabric SSO on, password off | Learning, custom builds |
| `universal-app` | Pre-populated | Mixed | Production apps |

**blankapp specifics:**
- `packages/data/src/index.ts` has empty `schema = []` — you build everything
- `dialect: mssql` must be added manually to `rayfin.yml` under `data:` service
- `packages/` monorepo structure: `data/`, `frontend/`, `shared/`
- Entity files go in `packages/data/src/`, NOT `rayfin/data/`

---

## rayfin.yml — data service

```yaml
data:
  enabled: true        # false by default in blankapp — flip when adding entities
  dialect: mssql       # must add manually — CLI does not generate this
  path: packages/data
  buildCommand: npm run build
```

Without `dialect: mssql`, `rayfin up db apply` returns `400 Bad Request: dialect`.

---

## Entity & @role Patterns

### Minimal entity
```typescript
import { entity, role, uuid, text, boolean, date } from '@microsoft/rayfin-core';

@entity()
@role('authenticated', ['create', 'read', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.ownerId),
})
export class TodoItem {
  @uuid() id!: string;
  @text() ownerId!: string;           // bind to claims.sub on create
  @text({ min: 1, max: 200 }) title!: string;
  @boolean() isCompleted!: boolean;
  @date() createdAt!: Date;
  @date({ optional: true }) dueDate?: Date;
}
```

### @role patterns
```typescript
// Owner + admin read/write, admin-only delete
@role('authenticated', ['create', 'read', 'update'], {
  policy: (claims, item) => claims.sub.eq(item.ownerId).or(claims.role.eq('admin'))
})
@role('authenticated', 'delete', {
  policy: (claims, _item) => claims.role.eq('admin')
})

// Full access for all authenticated users (no RLS)
@role('authenticated', '*')

// Field-level exclusion
@role('authenticated', 'read', { exclude: ['internalScore', 'adminNotes'] })
```

### Supported claims
| Claim | Description |
|---|---|
| `claims.sub` | Subject identifier (user ID) |
| `claims.email` | User email |
| `claims.role` | User role from identity provider |

### Expression operators
- `.eq()` — equality
- `.and()` / `.or()` — logical combine

### Registering entities in index.ts
```typescript
// packages/data/src/index.ts
import { TodoItem } from './TodoItem.js';           // import MUST come first
export type { UniversalAppSchema } from '@rayfin-app/shared';
export { TodoItem };
export const schema = [TodoItem];
```

---

## Build Order

TypeScript project references require building `shared` before `data`:

```powershell
npm run build --workspace=packages/shared
npm run build --workspace=packages/data
```

`npm run build --workspaces` fails if `data` builds before `shared` (race condition).

---

## Deployment Sequence (fresh app)

1. `npx rayfin up` — provisions Fabric SQL child item, sets dialect context server-side
2. `npx rayfin up db apply` — pushes schema (creates tables, enforces @role policies)

`db apply` alone on a fresh app returns `400: dialect` because the SQL child item
doesn't exist yet. `rayfin up` must run first.

---

## Auth

- **Production:** Fabric SSO (Entra ID) only — `auth.fabric.enabled: true`
- **Local dev:** email/password — `auth.password.enabled: true` (dev only)
- **blankapp default:** Fabric SSO on, password off
- `User` table auto-provisioned by Rayfin when `auth.fabric.enabled: true` — don't define it manually

---

## Connectors

```bash
# Add semantic model connector
npx rayfin connector add \
  --type fabric-semanticmodel \
  --workspace-id <workspace-id> \
  --item-id <semantic-model-item-id> \
  --name salesModel \
  --operations executeQuery
```

**Semantic model connector:** `executeQuery` only (DAX queries — read-only).
**Warehouse/SQL connector:** full `read/create/update/delete` via `@Source` decorated entities.

Frontend client setup for semantic model:
```typescript
import { ConnectorsRayfinClient } from '@microsoft/rayfin-client';
import { fabricSemanticModel } from '@microsoft/rayfin-connector-fabric-semanticmodel';
```

---

## .gitignore Must-Haves (per app)

Rayfin's own `.gitignore` in the scaffold covers most of these, but verify:
```
node_modules/
dist/
rayfin/.env          # contains RAYFIN_WORKSPACE_NAME and keys
rayfin/.temp/        # generated DAB config — never commit
```

`rayfin/.deployments.json`, `rayfin/.lockfile.json`, `rayfin/.project.json` —
these ARE committed (deployment state, not secrets).

---

## Known Gotchas

| Gotcha | Resolution |
|---|---|
| Scaffold lands at repo root | `Move-Item -Path "AppName" -Destination "apps\AppName"` immediately after scaffold |
| `400 Bad Request: dialect` on `db apply` | Run `rayfin up` first to provision SQL child item; also add `dialect: mssql` to `rayfin.yml` |
| `Cannot find module '@rayfin-app/shared'` | Run `npm install` from app root to wire workspace symlinks, then build shared before data |
| `Cannot find name 'TodoItem'` in index.ts | Import must precede use: add `import { TodoItem } from './TodoItem.js'` at top |
| `npm run build --workspaces` fails | Build order: `shared` then `data` — use `--workspace=packages/shared` then `--workspace=packages/data` |
| "Sign in failed" in Fabric portal during local dev | Expected — Fabric SSO can't reach localhost backend; use `http://localhost:5173/` instead |
| LF→CRLF warnings on `git add` | Scaffold uses Unix line endings; add `.gitattributes` to normalize (cleanup task) |
| `rayfin dev` picks wrong workspace | Answer the CLI prompt; workspace is persisted to `rayfin/.env` |
| `Set-Content -Encoding UTF8` writes BOM | Use `[IO.File]::WriteAllText($p, $content, (New-Object System.Text.UTF8Encoding($false)))` for any file TypeScript/Vite will consume |
| PS 5.1 strips inner double-quotes from single-quoted JSON | Use `--% ` stop-parsing token for connector invoke: `npx rayfin --% connector invoke ...` |
| Heredoc (`<< 'EOF'`) doesn't work in PowerShell | Use Git Bash for multi-line file writes |

---

## Fabric Apps Portal — Child Items

After `rayfin up`, the App item in Fabric portal shows:
- **Database** — Fabric SQL database with your entity tables
- **Functions** — Azure Functions host (if configured)
- **Overview** — live URL, backend URL, publishable key

Schema changes always go through `npx rayfin up db apply` — never edit
the SQL database directly in the portal (causes schema conflicts).

---

*Last updated: 2026-10-28*
