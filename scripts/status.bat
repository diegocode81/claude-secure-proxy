@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "PROJECT_ROOT=%%~fI"
set "ENV_FILE=%PROJECT_ROOT%\.env"
set "PORT=3000"

if exist "%ENV_FILE%" (
  for /f "tokens=1,* delims==" %%A in ('findstr /b /c:"PORT=" "%ENV_FILE%"') do set "PORT=%%B"
)
set "PORT=%PORT:"=%"
set "PORT=%PORT:'=%"
if "%PORT%"=="" set "PORT=3000"

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:%PORT%/health' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if "%ERRORLEVEL%"=="0" (
  echo claude-secure-proxy is running.
) else (
  echo claude-secure-proxy is not running.
)
exit /b 0
