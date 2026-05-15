@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "PROJECT_ROOT=%%~fI"
set "DATA_DIR=%PROJECT_ROOT%\data"
set "PID_FILE=%DATA_DIR%\proxy.pid"
set "ENV_FILE=%PROJECT_ROOT%\.env"
set "PORT=3000"

if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

if exist "%ENV_FILE%" (
  for /f "tokens=1,* delims==" %%A in ('findstr /b /c:"PORT=" "%ENV_FILE%"') do set "PORT=%%B"
)
set "PORT=%PORT:"=%"
set "PORT=%PORT:'=%"
if "%PORT%"=="" set "PORT=3000"

if exist "%PID_FILE%" (
  set /p PID=<"%PID_FILE%"
  if not "%PID%"=="" taskkill /PID %PID% /T /F >nul 2>&1
)

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do (
  taskkill /PID %%P /T /F >nul 2>&1
)

if exist "%PID_FILE%" del "%PID_FILE%" >nul 2>&1
echo claude-secure-proxy stopped.
exit /b 0
