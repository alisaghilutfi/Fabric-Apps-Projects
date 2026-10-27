# Fabric-Apps-Projects — repo rules

Global guardrails: ~/.claude/CLAUDE.md (source: private repo dev-environment).

## Repo structure
- apps/<AppName>/ — one Rayfin app per folder.
- shared/components/ — shared UI components when patterns stabilise.
- HARNESS.md — CLI, entity patterns, build order, deploy sequence, gotchas. Read at session start before any code decisions.
- PROJECTS.md — app status board.

## Git
- Commit directly to main (no dev/test chain — live state is what rayfin up deployed).
- Conventional commits.
- Never commit: rayfin/.env, rayfin/.temp/, .env.local, node_modules/, dist/.
- rayfin/.deployments.json, rayfin/.lockfile.json, rayfin/.project.json ARE committed (deployment state).

## Harness split
- ProjectPlanner (claude.ai): architecture, entity design, @role policy design, session planning. Never executes.
- FabricEngineer (Claude Code): scaffold, file edits, builds, deploys, Git. Never makes architectural decisions without ProjectPlanner input.
- End of session: FabricEngineer updates PROJECTS.md and root README.md.

## Per-app rules
Read apps/<AppName>/AGENTS.md before writing any code for that app.
It owns capability routing, Rayfin API guidance, build conventions and deployment guardrails for that app.

## Deploy reminders (the drift hook also injects these)
- After editing rayfin/connectors/** or rayfin.yml: npx rayfin up (from the app folder)
- After editing packages/data/src/**: npx rayfin up db apply (from the app folder; requires rayfin up to have run once)
- Never edit the Fabric SQL database directly in the portal.

## Windows PowerShell
- BOM-free file writes: [IO.File]::WriteAllText($p, $content, (New-Object System.Text.UTF8Encoding($false)))
- JSON args to CLI: use --% stop-parsing token: npx rayfin --% connector invoke ...
- Multi-line file writes: use Git Bash, not PowerShell heredoc