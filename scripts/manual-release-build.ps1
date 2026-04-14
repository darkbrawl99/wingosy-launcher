# Build Windows release artifacts locally (no GitHub Actions).
# After this finishes, upload the printed files to: GitHub → Releases → Draft release → Attach binaries.
#
# Prerequisites: Node 20+, Rust stable, Visual Studio Build Tools (Windows), NSIS + WiX for Tauri bundling
#   (see https://tauri.app/v1/guides/getting-started/prerequisites )

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "==> Vite build..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Tauri bundle (NSIS .exe + MSI)..." -ForegroundColor Cyan
npm run tauri -- build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$bundle = Join-Path $root "src-tauri\target\release\bundle"
Write-Host "`n==> Artifacts (upload these to the GitHub Release):" -ForegroundColor Green
if (Test-Path $bundle) {
  Get-ChildItem -Path $bundle -Recurse -Include "*.exe", "*.msi" -File | ForEach-Object { $_.FullName }
} else {
  Write-Warning "Bundle folder not found at $bundle"
}
