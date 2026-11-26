param(
    [string]$Tools = (Join-Path $env:LOCALAPPDATA 'StudyDeskAndroidTools'),
    [string]$Output = (Join-Path $PSScriptRoot '..\StudyDesk-Android.apk')
)
$ErrorActionPreference = 'Stop'

function Invoke-BuildTool {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed with exit code $LASTEXITCODE." }
}

function Find-ToolFile {
    param([string]$Folder, [string]$Name)
    $file = Get-ChildItem -LiteralPath $Folder -Recurse -File -Filter $Name | Select-Object -First 1
    if (-not $file) { throw "Missing $Name in $Folder." }
    return $file.FullName
}

$javaBin = Split-Path -Parent (Find-ToolFile $Tools 'javac.exe')
$androidJar = Find-ToolFile (Join-Path $Tools 'platforms-android-35') 'android.jar'
$buildTools = Split-Path -Parent (Find-ToolFile (Join-Path $Tools 'build-tools-35.0.0') 'aapt2.exe')
$source = Join-Path $PSScriptRoot 'src\main'
$work = Join-Path $Tools 'study-desk-build'
$nativeSource = Join-Path $work 'android-source'
$assets = Join-Path $work 'assets'
$classes = Join-Path $work 'classes'
$dex = Join-Path $work 'dex'
$compiledResources = Join-Path $work 'resources.zip'
$javaJar = Join-Path $work 'classes.jar'
$unsigned = Join-Path $work 'unsigned.apk'
$aligned = Join-Path $work 'aligned.apk'
$signed = Join-Path $work 'signed.apk'
$keystore = Join-Path $Tools 'study-desk-key.p12'
$vault = Join-Path $Tools 'study-desk-key-password.clixml'
if (-not (Test-Path -LiteralPath $keystore -PathType Leaf) -or -not (Test-Path -LiteralPath $vault -PathType Leaf)) {
    throw 'The original signing key and its saved password are required to build an installable update. Restore them before continuing.'
}
foreach ($folder in @($work, $nativeSource, $assets, $classes, $dex)) { New-Item -ItemType Directory -Force -Path $folder | Out-Null }
Copy-Item -LiteralPath (Join-Path $source 'res') -Destination $nativeSource -Recurse -Force
Copy-Item -LiteralPath (Join-Path $source 'AndroidManifest.xml') -Destination $nativeSource -Force

Invoke-BuildTool node @((Join-Path $PSScriptRoot 'package-assets.cjs'), $assets)
$javaSources = @(Get-ChildItem -Recurse -LiteralPath (Join-Path $source 'java') -Filter '*.java' | ForEach-Object FullName)
Invoke-BuildTool (Join-Path $javaBin 'javac.exe') (@('--release','8','-Xlint:-options','-encoding','UTF-8','-cp',$androidJar,'-d',$classes) + $javaSources)
Invoke-BuildTool (Join-Path $javaBin 'jar.exe') @('--create','--file',$javaJar,'-C',$classes,'.')
Invoke-BuildTool (Join-Path $javaBin 'java.exe') @('-cp',(Join-Path $buildTools 'lib\d8.jar'),'com.android.tools.r8.D8','--lib',$androidJar,'--min-api','26','--output',$dex,$javaJar)
Invoke-BuildTool (Join-Path $buildTools 'aapt2.exe') @('compile','--dir',(Join-Path $nativeSource 'res'),'-o',$compiledResources)
Invoke-BuildTool (Join-Path $buildTools 'aapt2.exe') @('link','-I',$androidJar,'--manifest',(Join-Path $nativeSource 'AndroidManifest.xml'),'-A',$assets,'-o',$unsigned,$compiledResources)
Push-Location $dex
try { Invoke-BuildTool (Join-Path $buildTools 'aapt.exe') @('add',$unsigned,'classes.dex') }
finally { Pop-Location }
Invoke-BuildTool (Join-Path $buildTools 'zipalign.exe') @('-f','4',$unsigned,$aligned)

$env:STUDY_ANDROID_KEY_PASSWORD = [Net.NetworkCredential]::new('', (Import-Clixml -LiteralPath $vault)).Password
try {
    $signer = Join-Path $buildTools 'lib\apksigner.jar'
    Invoke-BuildTool (Join-Path $javaBin 'java.exe') @('-jar',$signer,'sign','--ks',$keystore,'--ks-key-alias','study-desk','--ks-pass','env:STUDY_ANDROID_KEY_PASSWORD','--out',$signed,$aligned)
    Invoke-BuildTool (Join-Path $javaBin 'java.exe') @('-jar',$signer,'verify','--verbose',$signed)
    Invoke-BuildTool (Join-Path $buildTools 'zipalign.exe') @('-c','4',$signed)
    Copy-Item -Force -LiteralPath $signed -Destination $Output
    Get-Item -LiteralPath $Output | Select-Object FullName, Length
} finally { Remove-Item Env:STUDY_ANDROID_KEY_PASSWORD -ErrorAction SilentlyContinue }
