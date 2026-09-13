# Bootstrap of the PeerDrop terminal client for Windows.
# Loads the binary into a cache directory and runs it with the arguments of the
# invocation.
#
# The image build replaces the version placeholder and the container start
# replaces the instance variables.
# An unreplaced version loads the newest release.

$ErrorActionPreference = "Stop"

$instanceScheme = "${HTTP_SCHEME}"
$instanceDomain = "${FRONTEND_DOMAIN}"
$version = "@PEERDROP_VERSION@"

$repository = "bjoern621/PeerDrop"

# Windows PowerShell 5.1 negotiates an older protocol by default.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if ([Environment]::Is64BitOperatingSystem -eq $false) {
    throw "peerdrop has no binary for this system. amd64 is supported."
}

$asset = "peerdrop-windows-amd64.exe"

# A release tag names its own assets. Anything else takes the newest release
# and loads it again on every run.
if ($version -match "^v[0-9]") {
    $release = "download/$version"
} else {
    $version = "latest"
    $release = "latest/download"
}

$sourceUrl = "https://github.com/$repository/releases/$release"
$directory = Join-Path $env:LOCALAPPDATA "peerdrop\$version"
$binary = Join-Path $directory $asset

New-Item -ItemType Directory -Force -Path $directory | Out-Null

if ((-not (Test-Path $binary)) -or ($version -eq "latest")) {
    try {
        Invoke-WebRequest -Uri "$sourceUrl/$asset" -OutFile "$binary.part" -UseBasicParsing
        Invoke-WebRequest -Uri "$sourceUrl/SHA256SUMS" -OutFile (Join-Path $directory "SHA256SUMS") -UseBasicParsing
    } catch {
        Remove-Item -Force -ErrorAction SilentlyContinue "$binary.part"
        throw "Could not load $asset from $sourceUrl. Check the connection, or take the binary from the release page of the repository."
    }

    Move-Item -Force "$binary.part" $binary

    $expected = Select-String -Path (Join-Path $directory "SHA256SUMS") -Pattern "\s$([regex]::Escape($asset))$" |
        ForEach-Object { $_.Line.Split(" ")[0] }
    $actual = (Get-FileHash -Algorithm SHA256 -Path $binary).Hash

    if ($expected -and ($expected -ne $actual.ToLower())) {
        Remove-Item -Force $binary
        throw "The checksum of $asset does not match. The file was removed."
    }
}

Write-Host "peerdrop is at $binary"

if ($instanceDomain) {
    $scheme = if ($instanceScheme) { $instanceScheme } else { "https" }
    & $binary --host "${scheme}://${instanceDomain}" @args
} else {
    & $binary @args
}

exit $LASTEXITCODE
