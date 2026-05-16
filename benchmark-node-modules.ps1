param(
    [string[]]$TestRoots = @(
        "D:\DiskSpeedTest\node_modules_benchmark",
        "G:\SteamLibrary\DiskSpeedTest\node_modules_benchmark"
    ),
    [int]$PackageCount = 500,
    [int]$FilesPerPackage = 20,
    [int]$FileSizeKB = 4
)

$ErrorActionPreference = "Stop"

function Ensure-Directory {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

function Measure-NodeModulesWrite {
    param(
        [Parameter(Mandatory = $true)][string]$RootPath,
        [Parameter(Mandatory = $true)][int]$PackageCount,
        [Parameter(Mandatory = $true)][int]$FilesPerPackage,
        [Parameter(Mandatory = $true)][int]$FileSizeKB
    )

    Ensure-Directory -Path $RootPath

    $free = (Get-PSDrive -Name ([System.IO.Path]::GetPathRoot($RootPath).TrimEnd('\').TrimEnd(':'))).Free
    $bytesPerFile = [int64]$FileSizeKB * 1KB
    $expected = [int64]$PackageCount * $FilesPerPackage * $bytesPerFile
    if ($free -lt $expected) {
        throw "Not enough free space on $RootPath. Free: $([math]::Round($free / 1MB, 2)) MB, needed: $([math]::Round($expected / 1MB, 2)) MB."
    }

    $payload = New-Object byte[] ([int]$bytesPerFile)
    [System.Random]::new().NextBytes($payload)

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $createdFiles = 0
    try {
        for ($pkg = 1; $pkg -le $PackageCount; $pkg++) {
            $pkgDir = Join-Path $RootPath ("pkg{0}" -f $pkg)
            Ensure-Directory -Path $pkgDir

            for ($file = 1; $file -le $FilesPerPackage; $file++) {
                $filePath = Join-Path $pkgDir ("file{0}.bin" -f $file)
                $stream = $null
                try {
                    $stream = New-Object System.IO.FileStream(
                        $filePath,
                        [System.IO.FileMode]::Create,
                        [System.IO.FileAccess]::Write,
                        [System.IO.FileShare]::None,
                        4096,
                        [System.IO.FileOptions]::WriteThrough
                    )
                    $stream.Write($payload, 0, $payload.Length)
                    $createdFiles++
                } finally {
                    if ($null -ne $stream) {
                        $stream.Dispose()
                    }
                }
            }
        }
    } finally {
        $sw.Stop()
        if (Test-Path -LiteralPath $RootPath) {
            Remove-Item -LiteralPath $RootPath -Recurse -Force
        }
    }

    $totalBytes = [int64]$createdFiles * $bytesPerFile
    $seconds = [math]::Round($sw.Elapsed.TotalSeconds, 3)
    $mbps = if ($seconds -gt 0) { [math]::Round(($totalBytes / 1MB) / $seconds, 2) } else { 0 }

    [pscustomobject]@{
        Path         = $RootPath
        Packages     = $PackageCount
        FilesPerPkg   = $FilesPerPackage
        FileSizeKB    = $FileSizeKB
        FilesWritten  = $createdFiles
        TotalMB       = [math]::Round($totalBytes / 1MB, 2)
        Seconds       = $seconds
        WriteMBps     = $mbps
    }
}

$results = foreach ($root in $TestRoots) {
    Measure-NodeModulesWrite -RootPath $root -PackageCount $PackageCount -FilesPerPackage $FilesPerPackage -FileSizeKB $FileSizeKB
}

$results | Format-Table -AutoSize
