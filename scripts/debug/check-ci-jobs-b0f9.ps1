$runs = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/runs?branch=master&per_page=8" -Headers @{"Accept"="application/vnd.github+json"}
$target = $runs.workflow_runs | Where-Object { $_.head_sha -like "b0f9bcf*" -and $_.conclusion -eq "failure" }
foreach ($run in $target) {
    Write-Host ("=== FAILED: " + $run.name + " | id=" + $run.id + " ===")
    $jobs = Invoke-RestMethod -Uri ("https://api.github.com/repos/TalWayn72/EduSphere/actions/runs/" + $run.id + "/jobs") -Headers @{"Accept"="application/vnd.github+json"}
    $jobs.jobs | Where-Object { $_.conclusion -eq "failure" } | ForEach-Object {
        $job = $_
        Write-Host ("  JOB: " + $job.name)
        $job.steps | Where-Object { $_.conclusion -eq "failure" } | ForEach-Object {
            Write-Host ("    STEP: " + $_.name)
        }
    }
}
