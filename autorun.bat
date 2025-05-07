@echo off
setlocal enabledelayedexpansion

:: --- Configuration ---
set "REPO_DIR=C:\Users\user\Documents\GitHub\AV-Mini-Grid-Offline-Dashboard"
set "GIT_BRANCH=main"
set "CONSTANTS_FILE=config\constants.ts"
set "VERSION_SEARCH_STRING=export const VERSION ="
set "PACKAGE_JSON=package.json"
set "BUILD_DIR=.next"
set "CHROME_APP_ID=hbblfifohofgngfbjbiimbbcimepbdcb"
set "STARTUP_WAIT_SECONDS=5"

:: --- Initial Checks ---
echo INFO: Starting dashboard update and launch script...
echo INFO: Current time: %DATE% %TIME%
echo INFO: Target repository directory: "%REPO_DIR%"

:: Check if target directory exists
if not exist "%REPO_DIR%" (
    echo ERROR: Repository directory not found: "%REPO_DIR%"
    goto ErrorExit
)

:: Change to the repository directory
cd /d "%REPO_DIR%"
if errorlevel 1 (
    echo ERROR: Failed to change directory to "%REPO_DIR%". Permissions issue?
    goto ErrorExit
)
echo INFO: Changed working directory to "%REPO_DIR%"

:: Check if it's a Git repository
if not exist ".git" (
    echo ERROR: Directory "%REPO_DIR%" does not appear to be a Git repository (missing .git folder).
    goto ErrorExit
)
echo INFO: Git repository detected.

:: Check Prerequisite commands
call :CheckCommand npm "Node Package Manager (npm)"
call :CheckCommand git "Git"
call :CheckCommand node "Node.js"

:: Check for essential files
if not exist "%CONSTANTS_FILE%" (
    echo ERROR: Configuration file not found: "%CONSTANTS_FILE%"
    goto ErrorExit
)
echo INFO: Configuration file found: "%CONSTANTS_FILE%"

if not exist "%PACKAGE_JSON%" (
    echo ERROR: Node package file not found: "%PACKAGE_JSON%". Cannot run npm commands.
    goto ErrorExit
)
echo INFO: Node package file found: "%PACKAGE_JSON%"

:: --- Version Extraction ---
set "localVersion="
set "remoteVersion="

:: Extract Local Version
echo INFO: Reading local version from "%CONSTANTS_FILE%"...
for /f "tokens=2 delims==" %%i in ('findstr /B /C:"%VERSION_SEARCH_STRING%" "%CONSTANTS_FILE%"') do (
    set "localVersion=%%~i"
)
if not defined localVersion (
    echo ERROR: Failed to find/parse local version string ('%VERSION_SEARCH_STRING%') in "%CONSTANTS_FILE%".
    goto ErrorExit
)
set "localVersion=%localVersion:;=%"
echo INFO: Local Version Detected: [%localVersion%]

:: Fetch Remote Changes
echo INFO: Fetching remote changes from origin...
git fetch origin
if errorlevel 1 (
    echo ERROR: 'git fetch origin' failed. Check network connection, Git remote configuration, and credentials.
    goto ErrorExit
)
echo INFO: Remote changes fetched successfully.

:: Extract Remote Version
echo INFO: Reading remote version from "%GIT_BRANCH%:%CONSTANTS_FILE%"...
for /f "tokens=2 delims==" %%i in ('git show "origin/%GIT_BRANCH%:%CONSTANTS_FILE%" 2^>nul ^| findstr /B /C:"%VERSION_SEARCH_STRING%"') do (
    set "remoteVersion=%%~i"
)
if not defined remoteVersion (
    echo ERROR: Failed to find/parse remote version string ('%VERSION_SEARCH_STRING%') in "origin/%GIT_BRANCH%:%CONSTANTS_FILE%".
    echo ERROR: Possible issues: Branch '%GIT_BRANCH%' doesn't exist remotely, file path is wrong, or version string format changed.
    goto ErrorExit
)
set "remoteVersion=%remoteVersion:;=%"
echo INFO: Remote Version Detected: [%remoteVersion%]

:: --- Update Logic ---
if "%localVersion%"=="%remoteVersion%" (
    echo INFO: Local version [%localVersion%] is already up to date with remote [%remoteVersion%]. No update needed.
) else (
    echo INFO: Local version [%localVersion%] differs from remote [%remoteVersion%]. Starting update process...

    echo INFO: Pulling changes from 'origin %GIT_BRANCH%'...
    git pull origin %GIT_BRANCH%
    if errorlevel 1 (
        echo ERROR: 'git pull origin %GIT_BRANCH%' failed. Possible merge conflicts or other Git issues. Resolve manually.
        goto ErrorExit
    )
    echo INFO: Git pull successful.

    echo INFO: Installing/updating Node dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: 'npm install' failed. Check '%PACKAGE_JSON%', network connection, and npm logs.
        goto ErrorExit
    )
    echo INFO: npm install successful.

    echo INFO: Building project...
    npm run build
    if errorlevel 1 (
        echo ERROR: 'npm run build' failed. Check build scripts in '%PACKAGE_JSON%' and build logs.
        goto ErrorExit
    )
    echo INFO: npm run build successful.

    :: Verify build directory exists after update build
    if not exist "%BUILD_DIR%" (
        echo ERROR: Build directory "%BUILD_DIR%" not found even after running 'npm run build' during update.
        goto ErrorExit
    )
     echo INFO: Build directory "%BUILD_DIR%" verified after update.
)

:: --- Ensure Build Exists (Final Check) ---
if not exist "%BUILD_DIR%" (
    echo WARNING: Build directory "%BUILD_DIR%" not found. Attempting to build now...
    npm run build
    if errorlevel 1 (
        echo ERROR: 'npm run build' failed during final check. Cannot proceed.
        goto ErrorExit
    )
    if not exist "%BUILD_DIR%" (
        echo ERROR: Build directory "%BUILD_DIR%" still not found after build attempt. Build process likely broken.
        goto ErrorExit
    )
    echo INFO: Project built successfully during final check.
) else (
    echo INFO: Build directory "%BUILD_DIR%" exists.
)

:: --- Application Launch ---
echo INFO: Starting the application in the background...
:: Using start with a title allows identifying the window if needed
start "AV Mini Grid Dashboard Backend" /min cmd /c "npm run start >nul 2>&1"
echo INFO: 'npm run start' command initiated in background. Allow ~%STARTUP_WAIT_SECONDS% seconds for startup.

:: Wait before launching the PWA
echo INFO: Waiting %STARTUP_WAIT_SECONDS% seconds before launching PWA...
timeout /t %STARTUP_WAIT_SECONDS% /nobreak > nul

:: Find Chrome Path
set "CHROME_EXE="
if defined ProgramFiles(x86) (
    if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
)
if not defined CHROME_EXE (
    if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
)

if not defined CHROME_EXE (
    echo WARNING: Google Chrome executable not found in standard locations. Cannot launch PWA automatically.
    echo WARNING: Please start the PWA manually if the application server started successfully.
    goto EndScript
)
echo INFO: Found Chrome at: "%CHROME_EXE%"

:: Launch PWA
echo INFO: Launching PWA (App ID: %CHROME_APP_ID%) in fullscreen mode...
start "" "%CHROME_EXE%" --profile-directory="Default" --app-id="%CHROME_APP_ID%" --start-fullscreen"
if errorlevel 1 (
    echo WARNING: Failed to launch Chrome PWA. Is Chrome running? Is the App ID correct?
    :: Continue script execution as the server might still be running
) else (
    echo INFO: PWA launch command issued.
)

goto EndScript

:: --- Subroutines ---
:CheckCommand
set "_cmd=%~1"
set "_cmdName=%~2"
where %_cmd% >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Prerequisite command '%_cmd%' (%_cmdName%) not found in PATH. Please install it.
    goto ErrorExit
)
echo INFO: Prerequisite check passed: %_cmd% (%_cmdName%) found.
goto :EOF


:: --- Exit Points ---
:ErrorExit
echo.
echo ====================== SCRIPT FAILED =======================
echo ERROR: Script stopped due to one or more errors listed above.
echo Please review the messages, resolve the issue, and try again.
echo ============================================================
pause  <--- Still here, waits for user input
exit /b 1

:EndScript
echo INFO: Script finished. The application server should be running in the background.
exit /b 0
