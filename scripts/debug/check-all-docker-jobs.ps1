param($RunId)
$jobs = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/runs/$RunId/jobs" -Headers @{"Accept"="application/vnd.github+json"}
Write-Host "Total jobs: $($jobs.total_count)"
$jobs.jobs | ForEach-Object {
    $status = if ($_.conclusion) { $_.conclusion } else { $_.status }
    Write-Host "$status | $($_.name)"
}
