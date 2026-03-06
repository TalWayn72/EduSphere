$runs = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/runs?branch=master&per_page=8" -Headers @{"Accept"="application/vnd.github+json"}
$target = $runs.workflow_runs | Where-Object { $_.head_sha -like "fea9669*" }
foreach ($run in $target) {
    $icon = if ($run.conclusion -eq "success") { "OK" } elseif ($run.conclusion -eq "failure") { "FAIL" } elseif ($run.status -eq "in_progress") { "..." } else { $run.status + "/" + $run.conclusion }
    Write-Host ($icon + " " + $run.name)
    if ($run.conclusion -eq "failure") {
        $jobs = Invoke-RestMethod -Uri ("https://api.github.com/repos/TalWayn72/EduSphere/actions/runs/" + $run.id + "/jobs?per_page=30") -Headers @{"Accept"="application/vnd.github+json"}
        $jobs.jobs | Where-Object { $_.conclusion -eq "failure" } | ForEach-Object {
            $j = $_
            Write-Host ("  FAIL: " + $j.name)
            $j.steps | Where-Object { $_.conclusion -eq "failure" } | ForEach-Object {
                Write-Host ("    STEP: " + $_.name)
            }
        }
    }
}
