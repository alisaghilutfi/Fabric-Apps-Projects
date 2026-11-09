---
description: Trigger the session-recap-writer agent for a named Fabric App. Updates apps/<AppName>/CONTEXT.md, PROJECTS.md, and root README.md, then commits and pushes to main.
argument-hint: <AppName e.g. FabricApp_Governance>
---

Invoke the `session-recap-writer` agent for app `$ARGUMENTS`.

Pass it:
- App name: `$ARGUMENTS`
- Session summary: ask me for a brief summary of what was completed this session before proceeding, unless I have already provided one in this message.

The agent handles all file updates and the commit. Do not write or commit anything yourself — delegate entirely to the agent.
