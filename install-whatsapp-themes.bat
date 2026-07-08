@echo off
setlocal
set "INSTALLER_SELF=%~f0"
set "INSTALLER_DIR=%~dp0"

echo.
echo  WhatsApp Themes - Installer
echo  ===========================
echo.
echo  A folder picker will open.
echo  Choose the folder where the unpacked extension should be installed.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$m='# POWERSHELL_PAYLOAD'; $s=Get-Content -LiteralPath $env:INSTALLER_SELF -Raw; $i=$s.LastIndexOf($m); if ($i -lt 0) { Write-Error 'Installer payload not found'; exit 1 }; Invoke-Expression $s.Substring($i + $m.Length)"

if errorlevel 1 (
  echo.
  echo Installation failed. See messages above.
  pause
  exit /b 1
)

exit /b 0

# POWERSHELL_PAYLOAD
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

$extensionName = 'WhatsApp Themes'
$repoUrl = 'https://github.com/ApexBlue11/Whatsapp-Custom-Wallpaper'
$zipUrl = "$repoUrl/archive/refs/heads/main.zip"
$archiveRootName = 'Whatsapp-Custom-Wallpaper-main'
$scriptDir = $env:INSTALLER_DIR

function Show-Info($text, $title = $extensionName) {
  [System.Windows.Forms.MessageBox]::Show($text, $title, [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null
}

function Show-ErrorBox($text, $title = "$extensionName Installer") {
  [System.Windows.Forms.MessageBox]::Show($text, $title, [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
}

try {
  $picker = New-Object System.Windows.Forms.FolderBrowserDialog
  $picker.Description = "Select where to install $extensionName"
  $picker.ShowNewFolderButton = $true

  if ($picker.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
    Write-Host 'Installation cancelled.'
    exit 0
  }

  $installDir = $picker.SelectedPath
  $localManifest = Join-Path $scriptDir 'manifest.json'
  $usingLocalSource = Test-Path $localManifest
  $tempRoot = $null

  if ($usingLocalSource) {
    $sourceDir = $scriptDir
    Write-Host "Using local extension files: $sourceDir"
  } else {
    $tempRoot = Join-Path $env:TEMP ('wa-themes-install-' + [guid]::NewGuid().ToString('N'))
    $zipPath = Join-Path $tempRoot 'source.zip'
    $extractDir = Join-Path $tempRoot 'extracted'
    New-Item -ItemType Directory -Path $tempRoot, $extractDir -Force | Out-Null

    Write-Host "Downloading $extensionName from GitHub..."
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
    $sourceDir = Join-Path $extractDir $archiveRootName
  }

  if (-not (Test-Path (Join-Path $sourceDir 'manifest.json'))) {
    throw 'Could not find manifest.json in the extension source.'
  }

  Write-Host "Installing to: $installDir"
  $robocopyArgs = @(
    $sourceDir, $installDir,
    '/E', '/R:1', '/W:1',
    '/NFL', '/NDL', '/NJH', '/NJS', '/NP',
    '/XD', '.git', '.github', '.vscode', 'node_modules', '.agents', '.codex',
    '/XF', '*.log', 'publish-to-github.bat', 'publish-to-github.ps1'
  )
  & robocopy @robocopyArgs | Out-Null
  if ($LASTEXITCODE -ge 8) {
    throw "File copy failed with robocopy exit code $LASTEXITCODE."
  }

  $howTo = @"
$extensionName installed to:
$installDir

Load it in Chrome:
1. Open chrome://extensions
2. Turn on Developer mode
3. Click Load unpacked
4. Select this folder:
   $installDir

Use it on https://web.whatsapp.com/
"@
  $howToPath = Join-Path $installDir 'HOW-TO-INSTALL.txt'
  Set-Content -LiteralPath $howToPath -Value $howTo -Encoding UTF8

  if ($tempRoot -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }

  Start-Process notepad.exe $howToPath
  try {
    Start-Process 'chrome.exe' 'chrome://extensions'
  } catch {
    Write-Warning 'Could not launch Chrome automatically. Open chrome://extensions manually.'
  }

  Show-Info "Installation complete.`n`nInstalled to:`n$installDir`n`nChrome extensions page has been opened. Use Load unpacked and select the installed folder." "$extensionName Installed"
  exit 0
} catch {
  Show-ErrorBox "Installation failed:`n$($_.Exception.Message)"
  Write-Error $_
  exit 1
}
