$jobs = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/runs/22564274044/jobs" -Headers @{"Accept"="application/vnd.github+json"}
$job = $jobs.jobs | Where-Object { $_.name -eq "Build subgraph-content" } | Select-Object -First 1
Write-Host "Job: $($job.name) | id=$($job.id) | conclusion=$($job.conclusion)"
Write-Host "Steps:"
$job.steps | ForEach-Object {
    $status = if ($_.conclusion) { $_.conclusion } else { $_.status }
    Write-Host "  [$status] $($_.name)"
}
