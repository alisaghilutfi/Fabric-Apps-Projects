# Rayfin / Fabric Apps -- Harness Notes

## Scaffold
npm init @microsoft/create-rayfin@latest -- AppName

## Deploy
npx rayfin up                             # full deploy (from inside project folder)
npx rayfin up db apply                    # schema-only
npm run dev + rayfin dev functions apply  # local dev

## Environment
- Node.js v24.18.0
- CLI: @microsoft/rayfin-cli@1.36.0-alpha
- Fabric region: North Europe, F2 capacity

## PowerShell JSON gotcha
PS 5.1 strips inner double-quotes from single-quoted JSON strings.
Use stop-parsing token with doubled quotes for connector invoke:
  npx rayfin --% connector invoke ...

## .gitignore must-haves
rayfin/.temp/  -- generated artifacts, never commit

## Auth
Production: Fabric SSO (Entra ID) only.
Dev/local: email/password accepted.
