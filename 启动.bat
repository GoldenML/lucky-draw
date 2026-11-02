@echo off
rem (keep this file ASCII only - cmd parses it as GBK)
cd /d "%~dp0"

where python >nul 2>nul || goto NOPY

echo.
echo   Stopping previous server (if any) ...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'python*' -and $_.CommandLine -match 'http\.server 8777' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":8777" ^| findstr "LISTENING"') do taskkill /f /pid %%p >nul 2>&1

echo   Starting local server at http://127.0.0.1:8777 ...
start "LotteryServer" /min cmd /c "python -m http.server 8777 --bind 127.0.0.1"
timeout /t 2 >nul
start "" "http://127.0.0.1:8777/%%E6%%8A%%BD%%E5%%A5%%96.html"

echo.
echo   Done. The server runs in a MINIMIZED window (title: LotteryServer).
echo   Close that window to stop the server, or just run this file again -
echo   it will automatically replace the old server.
timeout /t 4 >nul
exit /b

:NOPY
echo.
echo   [!] Python not found on this computer.
echo       Without a local server, the browser cannot auto-read the .txt files.
echo       You can still open the html files by double-click, but then edit
echo       the .js config files instead (or drag a .txt into the page).
echo.
pause
start "" "%~dp0"
exit /b
