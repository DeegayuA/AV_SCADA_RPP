# Uninstall Script: uninstall.ps1
Write-Host "Uninstalling Solar Mini Grid App..."

# Stop the Node.js process
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

# Delete the installation directory
Remove-Item -Path "$env:LOCALAPPDATA\SolarMiniGridApp" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Uninstallation complete!"
