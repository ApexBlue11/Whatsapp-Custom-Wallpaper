@echo off
setlocal

powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1"

if errorlevel 1 (
  echo.
  echo Installation failed.
  exit /b 1
)

echo.
echo Installation finished.
