#ifndef MyAppName
  #define MyAppName "Dropshipping Tools"
#endif

#ifndef MyAppVersion
  #define MyAppVersion "0.0.0"
#endif

#ifndef MyAppPublisher
  #define MyAppPublisher "Unknown Publisher"
#endif

#ifndef MyPackId
  #define MyPackId "DropshippingTools"
#endif

#ifndef MyOutputDir
  #define MyOutputDir "."
#endif

#ifndef MyOutputBaseFilename
  #define MyOutputBaseFilename "DropshippingTools-Installer"
#endif

#ifndef MySetupSource
  #error MySetupSource is required.
#endif

[Setup]
AppId={#MyPackId}-Bootstrapper
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\{#MyPackId}
DisableDirPage=no
DisableFinishedPage=yes
DisableProgramGroupPage=yes
Compression=lzma2/ultra64
SolidCompression=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UsePreviousAppDir=yes
Uninstallable=no
CreateUninstallRegKey=no
DirExistsWarning=no
WizardStyle=modern
OutputDir={#MyOutputDir}
OutputBaseFilename={#MyOutputBaseFilename}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "{#MySetupSource}"; DestDir: "{tmp}"; DestName: "VelopackSetup.exe"; Flags: deleteafterinstall ignoreversion

[Run]
Filename: "{tmp}\VelopackSetup.exe"; Parameters: "--silent --installto ""{app}"""; StatusMsg: "Installing {#MyAppName}..."; Flags: waituntilterminated

[Code]
function PathStartsWith(const BasePath, CandidatePath: string): Boolean;
begin
  Result := Pos(AddBackslash(LowerCase(BasePath)), AddBackslash(LowerCase(CandidatePath))) = 1;
end;

function IsProtectedInstallPath(const CandidatePath: string): Boolean;
begin
  Result :=
    PathStartsWith(ExpandConstant('{win}'), CandidatePath) or
    PathStartsWith(ExpandConstant('{commonpf}'), CandidatePath) or
    PathStartsWith(ExpandConstant('{commonpf32}'), CandidatePath) or
    PathStartsWith(ExpandConstant('{commoncf}'), CandidatePath) or
    PathStartsWith(ExpandConstant('{commoncf32}'), CandidatePath);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;

  if CurPageID = wpSelectDir then
  begin
    if IsProtectedInstallPath(WizardDirValue) then
    begin
      MsgBox(
        'Choose a writable folder outside Program Files and Windows. The app needs write access to install future updates automatically.',
        mbError,
        MB_OK);
      Result := False;
    end;
  end;
end;
