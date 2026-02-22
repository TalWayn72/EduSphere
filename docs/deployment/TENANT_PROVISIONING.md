# EduSphere — Tenant Provisioning Guide

## Overview
EduSphere supports two Keycloak identity isolation models:

| Model | Use Case | User Isolation |
|-------|----------|---------------|
| **Multi-Realm** | Enterprise clients needing full IdP isolation | Complete: separate user database per tenant |
| **Single-Realm + Organizations** (Keycloak v26 native) | SaaS with many tenants | Strong: organization boundary enforced |

## Multi-Realm Provisioning (Enterprise)

### Prerequisites
- Keycloak 26+ running
- `kcadm.sh` in PATH (from Keycloak distribution)
- `KEYCLOAK_ADMIN_PASSWORD` environment variable set

### Provision a New Tenant
```bash
export KEYCLOAK_URL=https://auth.yourdomain.com
export KEYCLOAK_ADMIN_PASSWORD=<admin-password>

./scripts/provision-tenant-realm.sh \
  "acme-corp" \
  "550e8400-e29b-41d4-a716-446655440000" \
  "Acme Corporation" \
  "learn.acmecorp.com"
```

### What Gets Created
1. Keycloak realm `edusphere-acme-corp` with:
   - Brute force protection (G-12): max 5 failures, 15-minute lockout
   - SSL required for all connections
   - Access token TTL: 15 minutes (900 seconds)
   - 4 roles: STUDENT, INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN
2. Confidential OIDC client `edusphere-app` with:
   - Redirect URIs: `https://learn.acmecorp.com/*` and `https://acme-corp.edusphere.io/*`
   - Hardcoded `tenant_id` JWT claim — prevents cross-tenant token reuse

### Security Controls
- **G-20**: Each tenant gets a dedicated realm — users from tenant A cannot authenticate to tenant B
- **G-12**: All provisioned realms inherit brute force protection settings
- **Token scope**: `tenant_id` claim is hardcoded at realm level — cannot be spoofed by clients

## Data Residency (G-21)

### Configuring Per-Tenant Data Region
Update `tenants.settings.dataResidency` in the database:
```sql
UPDATE tenants
SET settings = jsonb_set(
  COALESCE(settings, '{}'),
  '{dataResidency}',
  '{"primaryRegion": "eu-central-1", "storageRegion": "eu-central-1", "allowCrossRegionBackup": false}'::jsonb
)
WHERE slug = 'acme-corp';
```

### Regions Supported
| Region | Location | GDPR Applicable |
|--------|----------|-----------------|
| `eu-central-1` | Frankfurt | Yes — EU supervisory authority: BfDI |
| `eu-west-1` | Ireland | Yes — EU supervisory authority: DPC |
| `us-east-1` | Virginia | No (use SCCs for EU users) |
| `ap-southeast-1` | Singapore | No |

## Custom Domain Setup (G-19)

### DNS Configuration (client action)
```
Type: CNAME
Name: learn  (creates learn.clientdomain.com)
Value: client-slug.edusphere.io
TTL: 300
```

### Verification
After DNS propagation, verify via:
```bash
# EduSphere automatically checks this DNS TXT record
dig TXT _edusphere-verify.learn.clientdomain.com

# Expected output:
_edusphere-verify.learn.clientdomain.com. 300 IN TXT "edusphere-verify=<token>"
```

SSL certificate is automatically provisioned via Let's Encrypt once DNS is verified.
