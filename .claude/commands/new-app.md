---
description: Scaffold a new Fabric App. Wraps the HARNESS.md scaffold procedure with dialect and data.enabled reminders.
argument-hint: <AppName e.g. FabricApp_Governance>
---

## Pre-flight check

Before running any commands, confirm these with the user:

1. **App name:** Is `$ARGUMENTS` the correct app name? (PascalCase, e.g. `FabricApp_Governance`)
2. **Dialect:** Will this app use `mssql`? (required for `rayfin up db apply` — must be added manually to `rayfin.yml`)
3. **Data enabled:** Does this app need entities and a SQL child item? (`data.enabled: true` in `rayfin.yml` — false by default in blankapp)

If $ARGUMENTS is empty, ask for the app name before proceeding.

STOP after the pre-flight. Do not scaffold until the user confirms all three.

---

## Scaffold

Run from the repo root:

```
npm create @microsoft/rayfin@latest
```

When the CLI prompts for a name, enter `$ARGUMENTS`.

Immediately after the scaffold completes, move it into `apps/`:

```
Move-Item -Path "$ARGUMENTS" -Destination "apps\$ARGUMENTS"
```

---

## Post-scaffold checklist

Complete all of these before the first commit:

1. **`rayfin.yml` — add dialect** (if data enabled):
   Under the `data:` service block, add:
   ```
   dialect: mssql
   ```
   Without this, `rayfin up db apply` returns `400 Bad Request: dialect`.

2. **`rayfin.yml` — set `data.enabled: true`** if the app needs entities.

3. **Create `apps/$ARGUMENTS/CONTEXT.md`** with these sections:
   - App Info (name, workspace, live URL — leave URL blank until first deploy)
   - Deployment (dialect, data enabled, auth mode)
   - Screens (list planned screens)
   - Connectors (none until added)
   - Entities (none until defined)
   - Open Items
   - Last Session

4. **Add a row to `PROJECTS.md`** for this app — Status: In Progress, Live URL: TBD.

5. **Add a row to root `README.md`** app table.

---

## Commit

```
git add apps/$ARGUMENTS/ PROJECTS.md README.md
git commit -m "feat: scaffold $ARGUMENTS (D11)"
git push origin main
```

Report the commit hash when done.
