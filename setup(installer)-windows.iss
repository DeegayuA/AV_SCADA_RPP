[Setup]
AppName=Solar Mini Grid
AppVersion=1.0
DefaultDirName={localappdata}\SolarMiniGrid
OutputDir=.
OutputBaseFilename=SolarMiniGridInstaller
Compression=lzma
SolidCompression=yes
Uninstallable=yes
UninstallDisplayName=Solar Mini Grid
UninstallDisplayIcon={app}\AV_Icon.ico
UninstallCommand="{app}\uninstall.bat"

[Files]
Source: "setup.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "AV_Icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Solar Mini Grid"; Filename: "{app}\setup.ps1"

[Run]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\setup.ps1"""; StatusMsg: "Installing Solar Mini Grid..."; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
