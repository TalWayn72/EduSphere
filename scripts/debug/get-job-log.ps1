param($RunId, $JobName)
$jobs = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/runs/$RunId/jobs" -Headers @{"Accept"="application/vnd.github+json"}
$job = $jobs.jobs | Where-Object { $_.name -like "*$JobName*" } | Select-Object -First 1
if (-not $job) { Write-Host "Job '$JobName' not found. Available:"; $jobs.jobs | ForEach-Object { Write-Host "  $($_.name)" }; exit 1 }
Write-Host "Job: $($job.name) | id=$($job.id) | conclusion=$($job.conclusion)"
$log = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/jobs/$($job.id)/logs" -Headers @{"Accept"="application/vnd.github+json"} 2>&1
Write-Host $log
