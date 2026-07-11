@echo off
setlocal

if exist "%~dp0install.ps1" (
  powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "irm -useb https://raw.githubusercontent.com/ApexBlue11/WhatsApp-Themes-Extension/main/install.ps1 | iex"
)

if errorlevel 1 (
  echo.
  echo Installation failed.
  exit /b 1
)

echo.
echo Installation finished.
