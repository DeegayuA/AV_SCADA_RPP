@echo off
echo Fetching latest changes from GitHub...
git pull origin main

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

echo Building project...
npm run build

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