[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type @'
using System.Runtime.InteropServices;
public static class CaptureDpiAwareness {
    [DllImport("user32.dll")]
    public static extern bool SetProcessDPIAware();
}
'@
[CaptureDpiAwareness]::SetProcessDPIAware() | Out-Null

$sourceDirectory = Split-Path -Parent $PSCommandPath
$repoRoot = [IO.Path]::GetFullPath((Join-Path $sourceDirectory '..\..\..\..'))
$heroSource = Join-Path $sourceDirectory 'hero.html'
$bannerPath = Join-Path $repoRoot 'banner.png'
$selectedPath = Join-Path $repoRoot 'concepts\marketing\2026-09-13\selected\banner.png'
$profilePath = Join-Path ([IO.Path]::GetTempPath()) ('geminibuddy-hero-' + [guid]::NewGuid().ToString('N'))

$browserCandidates = @(
    (Join-Path $env:LOCALAPPDATA 'ms-playwright\chromium-1194\chrome-win64\chrome.exe'),
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
)
$browser = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $browser) {
    throw 'Chrome or Edge was not found.'
}

New-Item -ItemType Directory -Path $profilePath | Out-Null
try {
    $heroUri = ([uri]$heroSource).AbsoluteUri
    $arguments = @(
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--no-first-run',
        '--no-default-browser-check',
        '--force-device-scale-factor=1',
        '--window-size=1600,900',
        '--virtual-time-budget=2500',
        "--user-data-dir=$profilePath",
        "--screenshot=$bannerPath",
        $heroUri
    )
    $process = Start-Process -FilePath $browser -ArgumentList $arguments -WindowStyle Hidden -PassThru -Wait
    if ($process.ExitCode -ne 0) {
        throw "Headless browser capture failed with exit code $($process.ExitCode)."
    }
    if (-not (Test-Path -LiteralPath $bannerPath)) {
        throw 'Headless browser capture did not create banner.png.'
    }

    $png = [IO.File]::ReadAllBytes($bannerPath)
    $width = [Net.IPAddress]::NetworkToHostOrder([BitConverter]::ToInt32($png, 16))
    $height = [Net.IPAddress]::NetworkToHostOrder([BitConverter]::ToInt32($png, 20))
    if ($width -ne 1600 -or $height -ne 900) {
        throw "Expected a 1600x900 hero, received ${width}x${height}."
    }
    Copy-Item -LiteralPath $bannerPath -Destination $selectedPath -Force
    Write-Host "Hero capture passed: $bannerPath (${width}x${height})."
}
finally {
    if (Test-Path -LiteralPath $profilePath) {
        $resolvedProfile = [IO.Path]::GetFullPath($profilePath)
        $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
        if ($resolvedProfile.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and
            [IO.Path]::GetFileName($resolvedProfile).StartsWith('geminibuddy-hero-', [StringComparison]::OrdinalIgnoreCase)) {
            Remove-Item -LiteralPath $resolvedProfile -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}
