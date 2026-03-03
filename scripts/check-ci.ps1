$r = Invoke-RestMethod -Uri "https://api.github.com/repos/TalWayn72/EduSphere/actions/runs?branch=master&per_page=8" -Headers @{"Accept"="application/vnd.github+json"}
$r.workflow_runs | ForEach-Object {
    $_.name + " | " + $_.status + " | " + $_.conclusion + " | " + $_.head_sha.Substring(0,8)
}
