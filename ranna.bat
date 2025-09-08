::[Bat To Exe Converter]
::
::YAwzoRdxOk+EWAjk
::fBw5plQjdCyDJGyX8VAjFC5HSRa+GGS5E7gZ5vzo082OtmUIVt4eTsL207qHbccB40GpWpAr2nNUnYYoDQhQfB2qfAsIiFh9n2eKOYmVsACB
::YAwzuBVtJxjWCl3EqQJgSA==
::ZR4luwNxJguZRRnk
::Yhs/ulQjdF+5
::cxAkpRVqdFKZSDk=
::cBs/ulQjdF+5
::ZR41oxFsdFKZSDk=
::eBoioBt6dFKZSDk=
::cRo6pxp7LAbNWATEpCI=
::egkzugNsPRvcWATEpCI=
::dAsiuh18IRvcCxnZtBJQ
::cRYluBh/LU+EWAnk
::YxY4rhs+aU+JeA==
::cxY6rQJ7JhzQF1fEqQJQ
::ZQ05rAF9IBncCkqN+0xwdVs0
::ZQ05rAF9IAHYFVzEqQJQ
::eg0/rx1wNQPfEVWB+kM9LVsJDGQ=
::fBEirQZwNQPfEVWB+kM9LVsJDGQ=
::cRolqwZ3JBvQF1fEqQJQ
::dhA7uBVwLU+EWDk=
::YQ03rBFzNR3SWATElA==
::dhAmsQZ3MwfNWATElA==
::ZQ0/vhVqMQ3MEVWAtB9wSA==
::Zg8zqx1/OA3MEVWAtB9wSA==
::dhA7pRFwIByZRRnk
::Zh4grVQjdCyDJGyX8VAjFA5HSRa+GG6pDaET+NTW5uSO72oPXeZ/W4DVzqaBLKAj60vhedgozn86
::YB416Ek+ZG8=
::
::
::978f952a14a936cc963da21a135fa983
@echo off
setlocal

REM === Step 0: Go to project folder ===
cd /d "C:\Users\User\Documents\GitHub\AV-Mini-Grid-Offline-Dashboard"

REM === Step 1: Check if Next.js build exists ===
if not exist ".next" (
    echo 🔧 No build found. Running next build...
    call npm run build
) else (
    echo ✅ Build already exists.
)

REM === Step 2: Start the Next.js server ===
echo 🚀 Starting the Next.js server...
start "Next.js Server" cmd /c "npm run start"

REM === Step 3: Wait a moment for server to start ===
timeout /t 5 /nobreak > nul

REM === Step 4: Define persistent user data directory for Edge ===
set "USER_DATA_DIR=%~dp0user-data"

REM === Step 4a: Launch Microsoft Edge with persistent profile in fullscreen
echo 🖥️ Launching Microsoft Edge with persistent storage...
start "" /wait "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
  --user-data-dir="%USER_DATA_DIR%" ^
  --profile-directory="Default" ^
  http://localhost:3000 ^
  --no-first-run ^
  --start-fullscreen

REM === Step 4b: Wait a bit to let Edge open ===
timeout /t 1 /nobreak > nul

REM === Step 5: Since Edge was closed, also exit this CMD ===
echo ❌ Edge closed. Exiting script.
exit /b

endlocal
