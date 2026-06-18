# Deploy: git commit + push, then SSH to VPS (git pull, npm ci, build, pm2 restart).
#
# Usage:
#   .\scripts\deploy.ps1 -Message "update portfolio"
#   npm run deploy -- -Message "update portfolio"
#   .\scripts\deploy.ps1 -RemoteOnly

param(
  [string]$Message = "",
  [switch]$RemoteOnly,
  [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$ConfigPath = Join-Path $PSScriptRoot "deploy.config.ps1"
$ExampleConfigPath = Join-Path $PSScriptRoot "deploy.config.ps1.example"

$DeployConfig = @{
  SshHost    = "root@194.67.121.174"
  RemotePath = "/var/www/doorpoint/doorpoint_nextjs"
  Pm2Name    = "doorpoint_nextjs"
  GitBranch  = "main"
  RunBackup  = $false
}

if (Test-Path $ConfigPath) {
  . $ConfigPath
} elseif (-not (Test-Path $ExampleConfigPath)) {
  Write-Warning "No deploy.config.ps1 - using built-in defaults."
}

function Write-Step([string]$Text) {
  Write-Host ""
  Write-Host "==> $Text" -ForegroundColor Cyan
}

function Invoke-Git([string[]]$GitArgs) {
  & git -C $RootDir @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed with exit code $LASTEXITCODE"
  }
}

Set-Location $RootDir

if (-not $RemoteOnly) {
  if (-not $Message.Trim()) {
    $Message = Read-Host "Commit message"
  }
  if (-not $Message.Trim()) {
    throw "Commit message is required."
  }

  Write-Step "Git status"
  Invoke-Git @("status", "--short")

  Write-Step "Git add"
  Invoke-Git @("add", "-A")

  $staged = & git -C $RootDir diff --cached --name-only
  if (-not $staged) {
    Write-Host "No staged changes. Skipping commit and push." -ForegroundColor Yellow
    $answer = Read-Host "Deploy to VPS anyway? (y/N)"
    if (-not $answer.Trim().ToLower().StartsWith("y")) {
      exit 0
    }
  } else {
    Write-Step "Git commit"
    Invoke-Git @("commit", "-m", $Message)

    Write-Step "Git push"
    Invoke-Git @("push", "origin", $DeployConfig.GitBranch)
  }
}

$runBackup = $DeployConfig.RunBackup -and -not $SkipBackup

$remoteLines = New-Object System.Collections.Generic.List[string]
[void]$remoteLines.Add("set -euo pipefail")
[void]$remoteLines.Add("cd $($DeployConfig.RemotePath)")
[void]$remoteLines.Add("echo '--- git pull ---'")
[void]$remoteLines.Add("git pull origin $($DeployConfig.GitBranch)")

if ($runBackup) {
  [void]$remoteLines.Add('./scripts/backup-db.sh || true')
}

[void]$remoteLines.Add("echo '--- npm ci ---'")
[void]$remoteLines.Add("npm ci")
[void]$remoteLines.Add("echo '--- npm run build ---'")
[void]$remoteLines.Add("npm run build")
[void]$remoteLines.Add("echo '--- pm2 restart ---'")
[void]$remoteLines.Add("pm2 restart $($DeployConfig.Pm2Name)")
[void]$remoteLines.Add("pm2 list")
[void]$remoteLines.Add("echo '--- done ---'")

$remoteScript = $remoteLines -join "`n"

Write-Step "Deploy on VPS ($($DeployConfig.SshHost))"
Write-Host $remoteScript

& ssh $DeployConfig.SshHost $remoteScript
if ($LASTEXITCODE -ne 0) {
  throw "Remote deploy failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "Deploy finished." -ForegroundColor Green
