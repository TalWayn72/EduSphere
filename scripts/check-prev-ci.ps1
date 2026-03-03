# Check CI status of a specific commit
param($Sha)
$runs = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/runs?head_sha=$Sha&per_page=10" -Headers @{"Accept"="application/vnd.github+json"}
Write-Host "=== CI for commit $Sha ==="
$runs.workflow_runs | ForEach-Object {
    $_.name + " | " + $_.status + " | " + ($_.conclusion ?? "?") + " | " + $_.head_sha.Substring(0,8)
}
