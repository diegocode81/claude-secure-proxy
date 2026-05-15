@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "PROJECT_ROOT=%%~fI"
set "DATA_DIR=%PROJECT_ROOT%\data"
set "PID_FILE=%DATA_DIR%\proxy.pid"
set "LOG_FILE=%DATA_DIR%\proxy.log"
set "ENV_FILE=%PROJECT_ROOT%\.env"
set "PORT=3000"

if not exist "%ENV_FILE%" (
  echo Missing .env file. Copy .env.example to .env and configure ANTHROPIC_API_KEY.
  exit /b 1
)

if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

for /f "tokens=1,* delims==" %%A in ('findstr /b /c:"PORT=" "%ENV_FILE%"') do set "PORT=%%B"
set "PORT=%PORT:"=%"
set "PORT=%PORT:'=%"
if "%PORT%"=="" set "PORT=3000"

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:%PORT%/health' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if "%ERRORLEVEL%"=="0" (
  echo claude-secure-proxy is already running.
  exit /b 0
)

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do (
  echo claude-secure-proxy is already running.
  exit /b 0
)

pushd "%PROJECT_ROOT%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run dev >> ""%LOG_FILE%"" 2>&1' -WorkingDirectory '%PROJECT_ROOT%' -WindowStyle Hidden -PassThru; Set-Content -Path '%PID_FILE%' -Value $p.Id"
popd

echo claude-secure-proxy started on http://localhost:%PORT%
exit /b 0
