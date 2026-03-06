$shas = @("33b86d7", "46e9395")
foreach ($sha in $shas) {
    $runs = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/runs?head_sha=$sha&per_page=10" -Headers @{"Accept"="application/vnd.github+json"}
    Write-Host "=== CI for $sha ==="
    $runs.workflow_runs | ForEach-Object {
        $c = if ($_.conclusion) { $_.conclusion } else { "?" }
        $_.name + " | " + $_.status + " | " + $c
    }
    Write-Host ""
}
