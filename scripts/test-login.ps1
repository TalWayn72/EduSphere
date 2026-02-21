$pairs = @(
    @{ user="super.admin@edusphere.dev"; pass="SuperAdmin123!" },
    @{ user="student@example.com"; pass="Student123!" }
)

foreach ($p in $pairs) {
    # edusphere-backend has directAccessGrantsEnabled: true
    $body = "client_id=edusphere-backend&username=$([uri]::EscapeDataString($p.user))&password=$([uri]::EscapeDataString($p.pass))&grant_type=password"
    try {
        $r = Invoke-WebRequest `
            -Uri "http://localhost:8080/realms/edusphere/protocol/openid-connect/token" `
            -Method Post `
            -Body $body `
            -ContentType "application/x-www-form-urlencoded" `
            -UseBasicParsing
        $json = $r.Content | ConvertFrom-Json
        Write-Host "OK  [$($p.user)] expires_in=$($json.expires_in)"
    } catch {
        $status = $_.Exception.Response.StatusCode
        $detail = $_.ErrorDetails.Message
        Write-Host "FAIL[$($p.user)] HTTP $status - $detail"
    }
}
