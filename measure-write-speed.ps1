param(
    [string[]]$TestRoots = @(
        "D:\DiskSpeedTest",
        "G:\SteamLibrary\DiskSpeedTest"
    ),
    [int]$FileSizeMB = 1024,
    [int]$ChunkSizeMB = 4
)

$ErrorActionPreference = "Stop"

function Ensure-TestDirectory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

function Measure-WriteSpeed {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootPath,
        [Parameter(Mandatory = $true)]
        [int]$SizeMB,
        [Parameter(Mandatory = $true)]
        [int]$BufferMB
    )

    Ensure-TestDirectory -Path $RootPath

    $drive = Get-PSDrive -Name ([System.IO.Path]::GetPathRoot($RootPath).TrimEnd('\').TrimEnd(':'))
    $freeBytes = [int64]$drive.Free
    $targetBytes = [int64]$SizeMB * 1MB
    if ($freeBytes -lt $targetBytes) {
        throw "Not enough free space on $RootPath. Free: $([math]::Round($freeBytes / 1MB, 2)) MB, needed: $SizeMB MB."
    }

    $fileName = "write-test_{0}.bin" -f ([Guid]::NewGuid().ToString("N"))
    $filePath = Join-Path $RootPath $fileName
    $buffer = New-Object byte[] ([int]($BufferMB * 1MB))
    $rng = [System.Random]::new()
    $rng.NextBytes($buffer)

    $stream = $null
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $stream = New-Object System.IO.FileStream(
            $filePath,
            [System.IO.FileMode]::Create,
            [System.IO.FileAccess]::Write,
            [System.IO.FileShare]::None,
            [int]($BufferMB * 1MB),
            [System.IO.FileOptions]::WriteThrough
        )

        $remaining = $targetBytes
        while ($remaining -gt 0) {
            $toWrite = [int][Math]::Min($buffer.Length, $remaining)
            $stream.Write($buffer, 0, $toWrite)
            $remaining -= $toWrite
        }

        $stream.Flush()
        $sw.Stop()
    } finally {
        if ($null -ne $stream) {
            $stream.Dispose()
        }
        if (Test-Path -LiteralPath $filePath) {
            Remove-Item -LiteralPath $filePath -Force
        }
    }

    $seconds = [math]::Round($sw.Elapsed.TotalSeconds, 3)
    $mbps = if ($seconds -gt 0) { [math]::Round($SizeMB / $seconds, 2) } else { 0 }

    [pscustomobject]@{
        Path         = $RootPath
        FileSizeMB   = $SizeMB
        ChunkSizeMB  = $BufferMB
        Seconds      = $seconds
        WriteMBps    = $mbps
    }
}

$results = foreach ($root in $TestRoots) {
    Measure-WriteSpeed -RootPath $root -SizeMB $FileSizeMB -BufferMB $ChunkSizeMB
}

$results | Format-Table -AutoSize
