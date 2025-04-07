::[Bat To Exe Converter]
::
::YAwzoRdxOk+EWAjk
::fBw5plQjdCyDJGyX8VAjFA5HSRa+GGS5E7gZ5vzo082OtmUIVt4eTsL207qHbccB40GpWpAr2nNUnYYoDQhQfB2qfAsIiFh9n2eKOYmVsACB
::YAwzuBVtJxjWCl3EqQJgSA==
::ZR4luwNxJguZRRnk
::Yhs/ulQjdF+5
::cxAkpRVqdFKZSTk=
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
::Zh4grVQjdCyDJGyX8VAjFA5HSRa+GG6pDaET+NTW5uSO72oPXeZyVIDY27jDAfADpED8cPY=
::YB416Ek+ZG8=
::
::
::978f952a14a936cc963da21a135fa983
@echo off
cd /d "C:\Users\user\Documents\GitHub\AV-Mini-Grid-Offline-Dashboard"

:: Ensure npm is installed
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo npm is not installed! Please install Node.js first.
    pause
    exit /b
)

:: Check if node_modules exists, if not, install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

:: Check if .next build folder exists, if not, build the project
if not exist ".next" (
    echo Building project...
    npm run build
)

:: Start the Next.js app in a hidden window
echo Starting the app in the background...
start /min cmd /c "npm run start >nul 2>&1"

:: Wait for a few seconds before launching the PWA
timeout /t 5

:: Open the PWA in Chrome in fullscreen mode
echo Launching PWA in fullscreen mode...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --profile-directory=Default --app-id=hbblfifohofgngfbjbiimbbcimepbdcb --start-fullscreen"

:: Exit script without pause
exit