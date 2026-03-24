# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in EduSphere, please report it responsibly.

**Email:** security@edusphere.dev

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

| Action | Timeline |
|--------|----------|
| Acknowledge report | Within 48 hours |
| Initial assessment | Within 72 hours |
| Critical fix | Within 7 days |
| Non-critical fix | Within 30 days |

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x | Yes |
| < 1.0 | No |

## Security Measures

EduSphere implements multiple layers of security:

- **Row-Level Security (RLS)** — tenant isolation at the database level
- **JWT Authentication** — Keycloak OIDC with scope-based authorization
- **CORS** — strict origin allowlist (no wildcards in production)
- **PII Encryption** — AES-256-GCM for personal data at rest
- **NATS TLS** — encrypted inter-service messaging
- **Input Validation** — Zod schemas on all GraphQL mutations
- **Rate Limiting** — per-tenant and per-IP at the gateway
- **Query Depth/Complexity Limits** — DoS prevention for GraphQL

For detailed security documentation, see [docs/security/](docs/security/).

## Security Invariants

All contributions must comply with our 10 Security Invariants (SI-1 through SI-10). See [CONTRIBUTING.md](CONTRIBUTING.md) for the summary table.

## Disclosure Policy

We follow coordinated disclosure. Please do not publicly disclose vulnerabilities until a fix has been released.
