param($RunId, $SearchJob)
$jobs = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/runs/$RunId/jobs" -Headers @{"Accept"="application/vnd.github+json"}
$job = $jobs.jobs | Where-Object { $_.name -like "*$SearchJob*" } | Select-Object -First 1
if (-not $job) {
    Write-Host "Not found. Available jobs:"
    $jobs.jobs | ForEach-Object { Write-Host "  $($_.name) | $($_.conclusion)" }
    exit 1
}
Write-Host "Job: $($job.name) | id=$($job.id)"
$uri = "https://api.github.com/repos/TalWayn72/EduSphere/actions/jobs/$($job.id)/logs"
Invoke-WebRequest -Uri $uri -Headers @{"Accept"="application/vnd.github+json"} -OutFile "$env:TEMP\ci_log.txt" -MaximumRedirection 5 -ErrorAction Stop
Get-Content "$env:TEMP\ci_log.txt" -ErrorAction SilentlyContinue | Select-Object -Last 80
