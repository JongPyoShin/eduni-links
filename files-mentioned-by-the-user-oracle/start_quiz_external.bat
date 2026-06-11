@echo off
setlocal

cd /d "%~dp0"

echo Starting Oracle DB Quiz external access...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_external_access.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
    echo Done.
    echo.
    if exist "%~dp0outputs\external_access.txt" (
        type "%~dp0outputs\external_access.txt"
    ) else (
        echo outputs\external_access.txt was not found.
    )
) else (
    echo Failed with exit code %EXIT_CODE%.
)

echo.
if /i not "%~1"=="nopause" pause
exit /b %EXIT_CODE%
