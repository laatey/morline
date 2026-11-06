; =====================================================================
; Morline CLI - Inno Setup 6 Script
; Installs morline.exe and adds it to the user's PATH.
; =====================================================================

#define MyAppName "Morline CLI"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Morline"
#define MyAppURL "https://morline.space"

[Setup]
AppId={{6B1E2F44-8C3A-4D7B-9E21-7A3C5D9F0B12}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\Morline
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
DisableDirPage=yes
DisableReadyPage=yes
OutputDir=dist
OutputBaseFilename=Morline-CLI-Setup-{#MyAppVersion}
Compression=lzma2/max
SolidCompression=yes
ChangesEnvironment=yes
WizardStyle=modern
UninstallDisplayName={#MyAppName}

[Files]
Source: "dist\morline.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion isreadme

[Registry]
Root: HKCU; Subkey: "Environment"; ValueType: expandsz; ValueName: "Path"; ValueData: "{olddata};{app}"; Check: NeedsAddPath(ExpandConstant('{app}'))

[Code]
function NeedsAddPath(Dir: string): Boolean;
var
  Path: string;
begin
  if not RegQueryStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', Path) then
  begin
    Result := True;
    exit;
  end;
  Result := Pos(';' + Uppercase(Dir) + ';', ';' + Uppercase(Path) + ';') = 0;
end;
