$ErrorActionPreference = 'SilentlyContinue'
$out = @("== Session start ==")

$mcp = claude mcp list 2>$null | Select-String "powerbi|fabric-mcp"
$out += "MCP:"; $out += ($mcp | ForEach-Object { "  " + $_.Line.Trim() })
if ($mcp | Where-Object { $_.Line.Trim() -notmatch '^plugin:(powerbi-authoring|fabric-skills):powerbi-modeling-mcp' }) {
  $out += "WARNING: stale powerbi/fabric MCP registration present. Stop and report before working."
}

$acct = az account show --query "user.name" -o tsv
$out += "Azure: " + $(if ($acct) { $acct } else { "NOT LOGGED IN - ask user to run az login" })

$out += "Git: " + (git status -sb | Select-Object -First 1)
Write-Output ($out -join "`n")