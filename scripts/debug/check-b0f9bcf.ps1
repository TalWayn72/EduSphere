$runs = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/runs?head_sha=b0f9bcf&per_page=10" -Headers @{"Accept"="application/vnd.github+json"}
$failed = $runs.workflow_runs | Where-Object { $_.conclusion -eq "failure" }
foreach ($run in $failed) {
    Write-Host ("=== FAILED: " + $run.name + " | run_id=" + $run.id + " ===")
    $jobs = Invoke-RestMethod -Uri ("https://api.github.com/repos/TalWayn72/EduSphere/actions/runs/" + $run.id + "/jobs") -Headers @{"Accept"="application/vnd.github+json"}
    $jobs.jobs | Where-Object { $_.conclusion -eq "failure" } | ForEach-Object {
        Write-Host ("  JOB: " + $_.name)
        $_.steps | Where-Object { $_.conclusion -eq "failure" } | ForEach-Object {
            Write-Host ("    STEP: " + $_.name)
        }
    }
}
