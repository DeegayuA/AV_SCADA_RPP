::[Bat To Exe Converter]
::
::YAwzoRdxOk+EWAjk
::fBw5plQjdCyDJGyX8VAjFC5HSRa+GGS5E7gZ5vzo082OtmUIVt4eTsL207qHbccB40GpWpAr2nNUnYYoDQhQfB2qfAsIiFh9n2eKOYmVsACB
::YAwzuBVtJxjWCl3EqQJgSA==
::ZR4luwNxJguZRRnk
::Yhs/ulQjdF+5
::cxAkpRVqdFKZSzk=
::cBs/ulQjdF+5
::ZR41oxFsdFKZSTk=
::eBoioBt6dFKZSDk=
::cRo6pxp7LAbNWATEpCI=
::egkzugNsPRvcWATEpCI=
::dAsiuh18IRvcCxnZtBJQ
::cRYluBh/LU+EWAjk
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
::Zh4grVQjdCyDJGyX8VAjFC5HSRa+GG6pDaET+NTJ7uSJow1PedV/W4DVzqaBLKAj60vhedgozn86
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

REM === Step 4: Launch Microsoft Edge in kiosk mode ===
echo 🖥️ Launching Microsoft Edge in kiosk mode...
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk http://localhost:3000 --edge-kiosk-type=fullscreen --no-first-run

REM === Step 5: Monitor and restart Edge if it crashes ===
:monitor
timeout /t 60 /nobreak > nul
tasklist /fi "imagename eq msedge.exe" 2>NUL | find /i "msedge.exe" >NUL
if errorlevel 1 (
    echo ⚠️ Microsoft Edge has crashed. Restarting...
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk http://localhost:3000 --edge-kiosk-type=fullscreen --no-first-run
)
goto monitor

endlocal
