param(
    [string]$ExtensionName = "WhatsApp Themes",
    [string]$RepoName = "WhatsApp-Themes-Extension"
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

$repoUrl = "https://github.com/ApexBlue11/$RepoName"
$zipUrl = "$repoUrl/archive/refs/heads/main.zip"
$archiveRootName = "$RepoName-main"
$scriptDir = if ($MyInvocation.MyCommand.Path) { Split-Path $MyInvocation.MyCommand.Path } else { (Get-Location).Path }

function Show-Info($text, $title = $ExtensionName) {
  [System.Windows.Forms.MessageBox]::Show($text, $title, [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null
}

function Show-ErrorBox($text, $title = "$ExtensionName Installer") {
  [System.Windows.Forms.MessageBox]::Show($text, $title, [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
}

try {
  $picker = New-Object System.Windows.Forms.FolderBrowserDialog
  $picker.Description = "Select where to install $ExtensionName"
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
    $tempRoot = Join-Path $env:TEMP ('ext-install-' + [guid]::NewGuid().ToString('N'))
    $zipPath = Join-Path $tempRoot 'source.zip'
    $extractDir = Join-Path $tempRoot 'extracted'
    New-Item -ItemType Directory -Path $tempRoot, $extractDir -Force | Out-Null

    Write-Host "Downloading $ExtensionName from GitHub..."
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
    '/XD', '.git', '.github', '.vscode', 'node_modules', '.agents', '.codex', 'test',
    '/XF', '*.log', 'install.bat', 'install.ps1'
  )
  & robocopy @robocopyArgs | Out-Null
  if ($LASTEXITCODE -ge 8) {
    throw "File copy failed with robocopy exit code $LASTEXITCODE."
  }

  $howTo = @"
$ExtensionName installed to:
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
    Start-Process 'chrome.exe' "--load-extension=`"$installDir`""
    Start-Process 'chrome.exe' 'chrome://extensions'
  } catch {
    Write-Warning 'Could not launch Chrome automatically. Open chrome://extensions manually.'
  }

  Show-Info "Installation complete.`n`nInstalled to:`n$installDir`n`nChrome extensions page has been opened. If the extension is not automatically loaded, click Load unpacked and select the installed folder." "$ExtensionName Installed"
  exit 0
} catch {
  Show-ErrorBox "Installation failed:`n$($_.Exception.Message)"
  Write-Error $_
  exit 1
}
