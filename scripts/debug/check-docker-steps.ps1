$jobs = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/runs/22564274044/jobs" -Headers @{"Accept"="application/vnd.github+json"}
$job = $jobs.jobs | Where-Object { $_.name -like "*subgraph-annotation*" } | Select-Object -First 1
Write-Host "Job: $($job.name) | conclusion: $($job.conclusion)"
Write-Host "Steps:"
$job.steps | ForEach-Object {
    Write-Host "  [$($_.conclusion)] $($_.name) | started=$($_.started_at) completed=$($_.completed_at)"
}
