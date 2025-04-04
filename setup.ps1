# PowerShell Script: setup.ps1

# Define paths
$projectPath = "$env:LOCALAPPDATA\SolarMiniGridApp"
$repoURL = "https://github.com/DeegayuA/AV-Mini-Grid-Offline-Dashboard.git"
$nodeInstaller = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
$gitInstaller = "https://github.com/git-for-windows/git/releases/latest/download/Git-2.43.0-64-bit.exe"

# Ensure Git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git not found! Installing..."
    Start-Process $gitInstaller -Wait
}

# Ensure Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js not found! Installing..."
    Start-Process $nodeInstaller -Wait
}

# Clone or pull latest code
if (-Not (Test-Path $projectPath)) {
    git clone $repoURL $projectPath
} else {
    cd $projectPath
    git pull
}

cd $projectPath

# Install dependencies
Write-Host "Installing dependencies..."
npm install

# Build the Next.js app
Write-Host "Building the app..."
npm run build

# Start the server in a hidden background process
Write-Host "Starting the server in the background..."
Start-Process "cmd.exe" "/c npm run start" -WorkingDirectory $projectPath -WindowStyle Hidden

# Wait for the server to start
Start-Sleep -Seconds 5

# Open Chrome as a full-screen PWA (or in web app mode)
Write-Host "Launching the app in full-screen mode..."
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" "--app=http://localhost:3000 --start-fullscreen"

# Register uninstall entry
$uninstallScriptPath = "$projectPath\uninstall.ps1"
Set-Content -Path $uninstallScriptPath -Value @"
Write-Host 'Uninstalling Solar Mini Grid App...'
Stop-Process -Name "node" -Force
Remove-Item -Path "$projectPath" -Recurse -Force
Write-Host 'Uninstallation complete!'
"@

Write-Host "Installation complete! You can uninstall from the Control Panel."

# Exit without closing PowerShell
exit