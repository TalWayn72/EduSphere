$runs = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/runs?branch=master&per_page=10" -Headers @{"Accept"="application/vnd.github+json"}
$target = $runs.workflow_runs | Where-Object { $_.head_sha -like "e7f612b*" -and $_.name -eq "Full Test Suite" }
foreach ($run in $target) {
    Write-Host ("=== Full Test Suite | id=" + $run.id + " | " + $run.conclusion + " ===")
    $jobs = Invoke-RestMethod -Uri ("https://api.github.com/repos/TalWayn72/EduSphere/actions/runs/" + $run.id + "/jobs?per_page=30") -Headers @{"Accept"="application/vnd.github+json"}
    $jobs.jobs | ForEach-Object {
        $j = $_
        $icon = if ($j.conclusion -eq "success") { "OK " } elseif ($j.conclusion -eq "failure") { "FAIL" } elseif ($j.conclusion -eq "skipped") { "SKIP" } else { "... " }
        Write-Host ("  " + $icon + " " + $j.name)
        if ($j.conclusion -eq "failure") {
            $j.steps | Where-Object { $_.conclusion -eq "failure" } | ForEach-Object {
                Write-Host ("      STEP: " + $_.name)
            }
        }
    }
}
