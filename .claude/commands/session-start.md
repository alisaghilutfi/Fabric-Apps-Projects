---
description: Read-only session-start report for one Fabric App — deploy status, open items, and next step. Does not execute anything until you confirm.
argument-hint: <AppName e.g. FabricApp_Governance>
---

App: `$ARGUMENTS`

READ-ONLY. Do not run rayfin, npx, or any execution command. The only shell call allowed is the read-only git log call in step 5.

**Input handling.** If $ARGUMENTS is empty or `apps/$ARGUMENTS` does not exist:
- List folders under `apps/` (exclude `_archive`).
- STOP. Ask which app to open.

1. Read `HARNESS.md` in full.
2. Read `apps/$ARGUMENTS/CONTEXT.md` in full.
3. Read `apps/$ARGUMENTS/AGENTS.md` if it exists; skip if not.
4. Read `apps/$ARGUMENTS/rayfin/rayfin.yml` if it exists — note whether `data.enabled` is true and what `dialect` is set to.
5. Run this read-only git command:
   ```
   git log -1 --date=short --format="%ad %h %s" -- "apps/$ARGUMENTS/"
   ```
6. Report status in 3–5 bullets covering: what is deployed (live URL if known), what schema version is active, what is in progress, what is blocked.
7. State any hard blockers that prevent work from starting.
8. Search `apps/$ARGUMENTS/CONTEXT.md` for lines or sections containing "Next development" or "Next session". Print each one found. If none found, say so.
9. Offer: "Run app-explorer for a full inventory of all apps? (yes/no)"

STOP after the report. Do not execute any step until the user confirms which step to take.
