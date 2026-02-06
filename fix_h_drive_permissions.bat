@echo off
echo Fixing H: drive permissions for user Will...
echo.
echo This requires Administrator privileges.
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo Running with Administrator privileges...
echo.

:: Grant full control to Will on H: drive with inheritance
echo Granting Will full control on H:\ ...
icacls "H:\" /grant:r "Will:(OI)(CI)F" /T /C

echo.
echo Done! You should now be able to save files anywhere on the H: drive.
echo.
pause
