$runs = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/runs?branch=master&per_page=8" -Headers @{"Accept"="application/vnd.github+json"}
$failed = $runs.workflow_runs | Where-Object { $_.conclusion -eq "failure" }
foreach ($run in $failed) {
    Write-Host "=== FAILED: $($run.name) | run_id=$($run.id) | sha=$($run.head_sha.Substring(0,8)) ==="
    # Get jobs for this run
    $jobs = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/runs/$($run.id)/jobs" -Headers @{"Accept"="application/vnd.github+json"}
    $jobs.jobs | Where-Object { $_.conclusion -eq "failure" } | ForEach-Object {
        Write-Host "  JOB FAILED: $($_.name)"
        $_.steps | Where-Object { $_.conclusion -eq "failure" } | ForEach-Object {
            Write-Host "    STEP FAILED: $($_.name)"
        }
    }
}
