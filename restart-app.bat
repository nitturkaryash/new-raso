@echo off
echo ======================================
echo GST Invoice System - Application Restart
echo ======================================
echo.

REM Kill any running Next.js processes
echo Stopping any running Next.js processes...
taskkill /f /im node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
  echo Successfully stopped existing processes.
) else (
  echo No running Next.js processes found.
)
echo.

REM Clear Next.js cache
echo Clearing Next.js cache...
if exist .next (
  rmdir /s /q .next
  echo Cache cleared successfully.
) else (
  echo No cache folder found.
)
echo.

REM Install dependencies
echo Installing dependencies...
call yarn install
if %ERRORLEVEL% NEQ 0 (
  echo Error installing dependencies. Please check your network connection.
  goto :error
)
echo Dependencies installed successfully.
echo.

REM Run the database test script
echo Testing database connection...
call node test-transaction.js
echo.

echo ======================================
echo Application restart complete!
echo.
echo To start the application, run:
echo yarn dev
echo ======================================

pause
exit /b 0

:error
echo.
echo Error occurred during restart. Please check the logs above.
pause
exit /b 1 