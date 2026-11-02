@echo off
rem (keep this file ASCII only - cmd parses it as GBK)

echo.
echo   Stopping server on port 8777 ...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'python*' -and $_.CommandLine -match 'http\.server 8777' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":8777" ^| findstr "LISTENING"') do taskkill /f /pid %%p >nul 2>&1
taskkill /fi "WINDOWTITLE eq LotteryServer*" >nul 2>&1

echo   Done.
timeout /t 2 >nul
exit /b
