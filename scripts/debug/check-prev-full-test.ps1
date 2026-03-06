$runs = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/runs?branch=master&per_page=10" -Headers @{"Accept"="application/vnd.github+json"}
$target = $runs.workflow_runs | Where-Object { $_.name -eq "Full Test Suite" } | Select-Object -First 3
foreach ($run in $target) {
    Write-Host ("=== Full Test Suite | sha=" + $run.head_sha.Substring(0,8) + " | " + $run.conclusion + " ===")
    $jobs = Invoke-RestMethod -Uri ("https://api.github.com/repos/TalWayn72/EduSphere/actions/runs/" + $run.id + "/jobs?per_page=30") -Headers @{"Accept"="application/vnd.github+json"}
    $jobs.jobs | Where-Object { $_.conclusion -eq "failure" } | ForEach-Object {
        Write-Host ("  FAIL: " + $_.name)
    }
}
