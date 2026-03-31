# EduSphere — Stale Node.js Process Cleanup
# Runs every 15 min via scheduled task. Kills node.exe older than 15 min (except dev/MCP/Docker/subgraphs).
# BUG-110 FIX (31 Mar 2026): Added "subgraph", "gateway", "edusphere" to protected list.
# Root cause: subgraphs (node dist/main on ports 4001-4006) were not matching any protected
# keyword and were killed every 15 min, causing "השרת אינו זמין" on /courses.
$logFile = "C:\Users\P0039217\.claude\projects\EduSphere\docs\logs\node-cleanup.log"
$threshold = (Get-Date).AddMinutes(-15)
$protected = @("vite", "mcp", "docker", "chromadb", "subgraph", "gateway", "edusphere")

$allNodes = Get-Process -Name "node" -ErrorAction SilentlyContinue
$beforeCount = ($allNodes | Measure-Object).Count

$killed = 0
foreach ($proc in $allNodes) {
    if ($proc.StartTime -and $proc.StartTime -lt $threshold) {
        try {
            $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId=$($proc.Id)").CommandLine
            $isProtected = $false
            foreach ($p in $protected) { if ($cmdLine -and $cmdLine -match $p) { $isProtected = $true; break } }
            if (-not $isProtected) {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                $killed++
            }
        } catch { }
    }
}

# Kill orphan Playwright chrome-headless-shell processes
$chromeKilled = 0
Get-Process -Name "chrome-headless-shell" -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    $chromeKilled++
}

$afterCount = (Get-Process -Name "node" -ErrorAction SilentlyContinue | Measure-Object).Count
$mem = (Get-CimInstance Win32_OperatingSystem)
$memPct = [math]::Round(($mem.FreePhysicalMemory / $mem.TotalVisibleMemorySize) * 100, 1)
$usedPct = 100 - $memPct

$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$entry = "$ts | Before: $beforeCount | Killed: $killed node, $chromeKilled chrome-headless | After: $afterCount | Memory: ${usedPct}% used"
Add-Content -Path $logFile -Value $entry
Write-Host $entry
