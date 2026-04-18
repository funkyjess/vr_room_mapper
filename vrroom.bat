@echo off
setlocal enabledelayedexpansion

if "%~1"=="" goto :help
if /i "%~1"=="start" goto :start
if /i "%~1"=="stop" goto :stop
if /i "%~1"=="restart" goto :restart
if /i "%~1"=="status" goto :status
if /i "%~1"=="help" goto :help
goto :help

:start
if "%~2"=="" (
    echo Starting all servers...
    call :start_backend
    timeout /t 3 /nobreak >nul
    call :start_frontend
) else if /i "%~2"=="backend" (
    call :start_backend
) else if /i "%~2"=="frontend" (
    call :start_frontend
) else (
    echo Unknown service: %~2
    goto :help
)
goto :eof

:stop
if "%~2"=="" (
    echo Stopping all servers...
    call :stop_backend
    call :stop_frontend
) else if /i "%~2"=="backend" (
    call :stop_backend
) else if /i "%~2"=="frontend" (
    call :stop_frontend
) else (
    echo Unknown service: %~2
    goto :help
)
goto :eof

:restart
call :stop %~2
timeout /t 2 /nobreak >nul
call :start %~2
goto :eof

:status
echo Checking server status...
echo.
call :check_port 8080 "Backend"
call :check_port 5173 "Frontend"
goto :eof

:start_backend
echo Starting Backend on port 8080 (Administrator required)...
start powershell -Verb RunAs -WindowStyle Normal -Command "cd '%~dp0backend'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8080; pause"
goto :eof

:start_frontend
echo Starting Frontend on port 5173...
cd "%~dp0frontend"
start cmd /k "npm run dev"
goto :eof

:stop_backend
echo Stopping Backend...
taskkill /F /IM python.exe 2>nul
goto :eof

:stop_frontend
echo Stopping Frontend...
taskkill /F /IM node.exe 2>nul
goto :eof

:check_port
netstat -ano | findstr ":%~1" | findstr LISTENING >nul
if %ERRORLEVEL%==0 (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%~1" ^| findstr LISTENING') do (
        echo [RUNNING] %~2 on port %~1 (PID: %%a)
    )
) else (
    echo [STOPPED] %~2 on port %~1
)
goto :eof

:help
echo SteamVR Room Mapper - Server Manager
echo =====================================
echo.
echo USAGE: vrroom.bat ^<command^> [service]
echo.
echo COMMANDS:
echo   start    [backend^|frontend^|all]  Start server(s)
echo   stop     [backend^|frontend^|all]  Stop server(s)
echo   restart  [backend^|frontend^|all]  Restart server(s)
echo   status                           Check server status
echo   help                             Show this help
echo.
echo EXAMPLES:
echo   vrroom.bat start                 Start all servers
echo   vrroom.bat start backend         Start only backend
echo   vrroom.bat stop frontend         Stop only frontend
echo   vrroom.bat restart               Restart all servers
echo   vrroom.bat status                Check which servers are running
echo.
