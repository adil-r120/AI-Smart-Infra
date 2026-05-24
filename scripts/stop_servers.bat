@echo off
echo [*] Stopping Smart-Infra Servers...

:: Kill Backend
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    echo [!] Killing Backend process (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

:: Kill Frontend
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo [!] Killing Frontend process (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

echo [DONE] Servers stopped.
pause
