$ErrorActionPreference = 'SilentlyContinue'
$raw = [Console]::In.ReadToEnd()
try { $in = $raw | ConvertFrom-Json } catch { exit 0 }
if (-not $in -or -not $in.tool_name) { exit 0 }

$file = $in.tool_input.path
if (-not $file) { $file = $in.tool_input.file_path }
if (-not $file) { exit 0 }

$isConnector = $file -match 'rayfin[\\/]connectors[\\/]|rayfin\.yml'
$isSchema    = $file -match 'packages[\\/]data[\\/]src[\\/]'

if ($isConnector) {
    $msg = "DEPLOY REMINDER: connector or rayfin.yml changed. Run from the app folder: npx rayfin up (full deploy - required for connector or first-time changes)"
} elseif ($isSchema) {
    $msg = "DEPLOY REMINDER: entity schema changed. Run from the app folder: npx rayfin up db apply (schema-only push - requires rayfin up to have run once)"
} else { exit 0 }

@{ hookSpecificOutput = @{ hookEventName = "PostToolUse"; additionalContext = $msg } } | ConvertTo-Json -Compress -Depth 3
exit 0