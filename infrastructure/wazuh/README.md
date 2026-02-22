# Wazuh SIEM Configuration

## Deployment
```bash
# Deploy Wazuh stack (manager + dashboard + OpenSearch)
docker compose -f docker-compose.monitoring.yml up -d

# Verify Wazuh manager is healthy
curl -k -u admin:$WAZUH_PASSWORD https://localhost:55000/
```

## Custom Rules
- `rules/edusphere-breach.xml` — EduSphere-specific detection rules (IDs 100001-100008)

## GDPR Compliance Module
Wazuh includes built-in GDPR ruleset. Enable in `/var/ossec/etc/ossec.conf`:
```xml
<ruleset>
  <rule_dir>rules</rule_dir>
  <rule_dir>ruleset/rules</rule_dir>
</ruleset>
```

## Alert Routing
All level 10+ alerts → `#security-alerts` Slack channel via Wazuh Slack integration.
All level 15 alerts → PagerDuty on-call rotation.
