# EduSphere Documentation Index

> Single-source navigation for all 120+ project documents.
> Last updated: March 2026 (Session 26)

---

## Root Documents (Core — Always in project root)

| File | Purpose |
|------|---------|
| [README.md](../README.md) | Project overview, quick start, architecture summary |
| [CLAUDE.md](../CLAUDE.md) | AI assistant configuration, conventions, security rules |
| [OPEN_ISSUES.md](../OPEN_ISSUES.md) | Live bug tracker and task status |
| [IMPLEMENTATION_ROADMAP.md](../IMPLEMENTATION_ROADMAP.md) | Phase order, acceptance criteria, phase gates |
| [API_CONTRACTS_GRAPHQL_FEDERATION.md](../API_CONTRACTS_GRAPHQL_FEDERATION.md) | GraphQL schema contracts, all types/mutations/subscriptions |
| [CHANGELOG.md](../CHANGELOG.md) | Release history and version changelog |

---

## docs/ai/ — AI & ML

| File | Purpose |
|------|---------|
| [AI_ML_PIPELINE.md](ai/AI_ML_PIPELINE.md) | LangGraph + LlamaIndex pipeline architecture |
| [MODEL_CARDS.md](ai/MODEL_CARDS.md) | Model transparency cards for all AI models used |

---

## docs/api/ — API Reference

| File | Purpose |
|------|---------|
| [DEMO_QUERIES.md](api/DEMO_QUERIES.md) | Sample GraphQL queries for all subgraphs |
| [GRAPHQL_OPERATIONS.md](api/GRAPHQL_OPERATIONS.md) | Full operation catalog (queries, mutations, subscriptions) |

---

## docs/architecture/ — Architecture Decisions

| File | Purpose |
|------|---------|
| [ARCHITECTURE.md](architecture/ARCHITECTURE.md) | System architecture overview, 6-subgraph federation |
| [PGBOUNCER.md](architecture/PGBOUNCER.md) | PgBouncer architecture and connection pooling design |

---

## docs/compliance/ — Compliance & Certification

| File | Purpose |
|------|---------|
| [HECVAT_LITE.md](compliance/HECVAT_LITE.md) | Higher Education Community Vendor Assessment |
| [VPAT_v2.5.md](compliance/VPAT_v2.5.md) | Voluntary Product Accessibility Template (WCAG 2.2) |

---

## docs/database/ — Database

| File | Purpose |
|------|---------|
| [DATABASE_SCHEMA.md](database/DATABASE_SCHEMA.md) | Full Drizzle schema, tables, RLS policies, indexes |

---

## docs/deployment/ — Deployment & Operations

| File | Purpose |
|------|---------|
| [DEPLOYMENT.md](deployment/DEPLOYMENT.md) | General deployment guide |
| [DOCKER_DEPLOYMENT.md](deployment/DOCKER_DEPLOYMENT.md) | Docker Compose deployment |
| [KUBERNETES_DEPLOYMENT.md](deployment/KUBERNETES_DEPLOYMENT.md) | K8s + Helm deployment |
| [AIR_GAPPED_INSTALL.md](deployment/AIR_GAPPED_INSTALL.md) | Offline / air-gapped installation guide |
| [QUICK_DEPLOY_GUIDE.md](deployment/QUICK_DEPLOY_GUIDE.md) | Fast-path deployment for experienced operators |
| [MONITORING.md](deployment/MONITORING.md) | Prometheus + Grafana monitoring setup |
| [OBSERVABILITY.md](deployment/OBSERVABILITY.md) | OpenTelemetry tracing and Jaeger |
| [SECURITY_HARDENING.md](deployment/SECURITY_HARDENING.md) | Production security hardening checklist |
| [TENANT_PROVISIONING.md](deployment/TENANT_PROVISIONING.md) | Multi-tenant provisioning runbook |
| [PGBOUNCER_CONNECTION_POOLING.md](deployment/PGBOUNCER_CONNECTION_POOLING.md) | PgBouncer ops configuration |
| [QUERY_HARDENING.md](deployment/QUERY_HARDENING.md) | Database query performance and hardening |
| [READ_REPLICAS.md](deployment/READ_REPLICAS.md) | PostgreSQL read replica setup |
| [DR_TEST_RESULTS.md](deployment/DR_TEST_RESULTS.md) | Disaster recovery test results |
| [MOBILE_RELEASE_CHECKLIST.md](deployment/MOBILE_RELEASE_CHECKLIST.md) | Expo / React Native release checklist |

---

## docs/development/ — Developer Guides

| File | Purpose |
|------|---------|
| [DEVELOPMENT_GUIDELINES.md](development/DEVELOPMENT_GUIDELINES.md) | Coding standards, patterns, conventions |
| [QUICKSTART.md](development/QUICKSTART.md) | New developer onboarding guide |
| [SETUP_INSTRUCTIONS.md](development/SETUP_INSTRUCTIONS.md) | Full local environment setup |
| [DOCKER_SETUP.md](development/DOCKER_SETUP.md) | Docker development environment |
| [GITHUB_SETUP.md](development/GITHUB_SETUP.md) | GitHub Actions, CI/CD setup |
| [CICD_FIX_PLAN.md](development/CICD_FIX_PLAN.md) | CI/CD pipeline fix and improvement plan |
| [CODE_QUALITY_IMPROVEMENT_PLAN.md](development/CODE_QUALITY_IMPROVEMENT_PLAN.md) | Code quality improvement plan |

---

## docs/legal/ — Legal

| File | Purpose |
|------|---------|
| [DPA_TEMPLATE.md](legal/DPA_TEMPLATE.md) | Data Processing Agreement template |
| [DPA_INSTRUCTIONS.md](legal/DPA_INSTRUCTIONS.md) | Instructions for completing the DPA |

---

## docs/logs/ — CI/Build Logs

| File | Purpose |
|------|---------|
| [ci_log_BuildContent.txt](logs/ci_log_BuildContent.txt) | CI build content log |
| [ci_log_Codegen.txt](logs/ci_log_Codegen.txt) | GraphQL codegen CI log |
| [ci_log_Lint.txt](logs/ci_log_Lint.txt) | ESLint CI run log |
| [ci_log_SchemaLinting.txt](logs/ci_log_SchemaLinting.txt) | Schema linting CI log |

---

## docs/plans/ — Active Implementation Plans

> Sub-folders:
> - `plans/bugs/` — Bug fix documents (BUG-NNN-*)
> - `plans/features/` — Feature implementation specs
> - `plans/archive/` — Completed sprint plans (historical)

---

## docs/policies/ — Information Security Policies

| File | Purpose |
|------|---------|
| [ACCESS_CONTROL_POLICY.md](policies/ACCESS_CONTROL_POLICY.md) | Role-based access control policy |
| [AI_USAGE_POLICY.md](policies/AI_USAGE_POLICY.md) | AI system usage and governance |
| [BUSINESS_CONTINUITY_POLICY.md](policies/BUSINESS_CONTINUITY_POLICY.md) | BCP policy |
| [CHANGE_MANAGEMENT_POLICY.md](policies/CHANGE_MANAGEMENT_POLICY.md) | Change control policy |
| [DATA_CLASSIFICATION_POLICY.md](policies/DATA_CLASSIFICATION_POLICY.md) | Data classification tiers |
| [ENCRYPTION_POLICY.md](policies/ENCRYPTION_POLICY.md) | Encryption standards |
| [GDPR_COMPLIANCE_POLICY.md](policies/GDPR_COMPLIANCE_POLICY.md) | GDPR compliance policy |
| [INCIDENT_RESPONSE_POLICY.md](policies/INCIDENT_RESPONSE_POLICY.md) | Security incident response policy |
| [INFORMATION_SECURITY_POLICY.md](policies/INFORMATION_SECURITY_POLICY.md) | ISMS information security policy |
| [VENDOR_MANAGEMENT_POLICY.md](policies/VENDOR_MANAGEMENT_POLICY.md) | Vendor assessment and management |

---

## docs/product/ — Product Requirements

| File | Purpose |
|------|---------|
| [PRODUCT_REQUIREMENTS.md](product/PRODUCT_REQUIREMENTS.md) | Full PRD — all features and requirements |
| [PRODUCT_GAP_ANALYSIS.md](product/PRODUCT_GAP_ANALYSIS.md) | Feature gap analysis vs competitors |
| [MOBILE_APP_REQUIREMENTS.md](product/MOBILE_APP_REQUIREMENTS.md) | Mobile-specific requirements |
| [MOBILE_APP.md](product/MOBILE_APP.md) | Mobile app overview and capabilities |
| [MOBILE_POLISH.md](product/MOBILE_POLISH.md) | Mobile polish tasks and UX improvements |
| [ADMIN_UPGRADE_PLAN.md](product/ADMIN_UPGRADE_PLAN.md) | Admin panel upgrade plan |
| [I18N_IMPLEMENTATION_PLAN.md](product/I18N_IMPLEMENTATION_PLAN.md) | Internationalisation implementation plan |
| [TIER3_IMPLEMENTATION_PLAN.md](product/TIER3_IMPLEMENTATION_PLAN.md) | Tier 3 feature implementation plan |
| [COMPETITIVE_GAP_ANALYSIS_PLAN.md](product/COMPETITIVE_GAP_ANALYSIS_PLAN.md) | Competitive gap analysis and closure plan |

---

## docs/project/ — Project Status & Logs

| File | Purpose |
|------|---------|
| [PROJECT_STATUS.md](project/PROJECT_STATUS.md) | Current project status dashboard |
| [IMPLEMENTATION_STATUS.md](project/IMPLEMENTATION_STATUS.md) | Phase-by-phase implementation status |
| [SESSION_SUMMARY.md](project/SESSION_SUMMARY.md) | Development session summaries |
| [SPRINT_ACTION_PLAN.md](project/SPRINT_ACTION_PLAN.md) | Current sprint action plan |

---

## docs/reference/ — Technical Reference

| File | Purpose |
|------|---------|
| [TECH_STACK_DECISIONS.md](reference/TECH_STACK_DECISIONS.md) | Architecture decision records (ADRs) |
| [DOCUMENT_NAMING_STANDARDS.md](reference/DOCUMENT_NAMING_STANDARDS.md) | File naming conventions for all docs |
| [MCP_TOOLS_SETUP.md](reference/MCP_TOOLS_SETUP.md) | MCP server configuration reference |
| [OPEN_SOURCE_TECHNOLOGY_AUDIT.md](reference/OPEN_SOURCE_TECHNOLOGY_AUDIT.md) | Open source license audit |
| [STACK_CAPABILITIES_UPGRADE_PLAN.md](reference/STACK_CAPABILITIES_UPGRADE_PLAN.md) | Tech stack upgrade roadmap |

---

## docs/reports/ — Performance & Test Reports

| File | Purpose |
|------|---------|
| [GATEWAY_FRONTEND_TEST_REPORT.md](reports/GATEWAY_FRONTEND_TEST_REPORT.md) | Gateway + frontend test results |
| [PERFORMANCE_BASELINE.md](reports/PERFORMANCE_BASELINE.md) | Performance baseline measurements |

---

## docs/research/ — Research & Analysis

| File | Purpose |
|------|---------|
| [COMPETITIVE_UX_RESEARCH.md](research/COMPETITIVE_UX_RESEARCH.md) | Competitive UX research analysis |

---

## docs/screenshots/ — Visual Verification

| Description | Pattern |
|-------------|---------|
| Feature scans | `scan-<feature>[-<variant>].png` |
| Flow steps | `step<N>-<description>.png` |
| See [README](screenshots/README.md) for full catalog (55 screenshots) | — |

---

## docs/security/ — Security & Privacy

| File | Purpose |
|------|---------|
| [SECURITY_PLAN.md](security/SECURITY_PLAN.md) | Overall security implementation plan |
| [SECURITY_CHECKLIST.md](security/SECURITY_CHECKLIST.md) | Pre-deploy security checklist |
| [INCIDENT_RESPONSE.md](security/INCIDENT_RESPONSE.md) | Incident response policy |
| [INCIDENT_RESPONSE_RUNBOOK.md](security/INCIDENT_RESPONSE_RUNBOOK.md) | Operational incident response runbook |
| [BREACH_REGISTER.md](security/BREACH_REGISTER.md) | Data breach register |
| [CRYPTO_INVENTORY.md](security/CRYPTO_INVENTORY.md) | Cryptographic controls inventory |
| [DATA_RETENTION_POLICY.md](security/DATA_RETENTION_POLICY.md) | Data retention and deletion policy |
| [DPIA_TEMPLATE.md](security/DPIA_TEMPLATE.md) | Data Protection Impact Assessment template |
| [GDPR_PROCESSING_ACTIVITIES.md](security/GDPR_PROCESSING_ACTIVITIES.md) | GDPR Article 30 processing register |
| [SUBPROCESSOR_REGISTER.md](security/SUBPROCESSOR_REGISTER.md) | Third-party subprocessor register |
| [VENDOR_REGISTER.md](security/VENDOR_REGISTER.md) | Vendor security assessment register |
| [COMPLIANCE_ACTION_PLAN.md](security/COMPLIANCE_ACTION_PLAN.md) | Compliance gap remediation plan |
| [LIA_PLATFORM_ANALYTICS.md](security/LIA_PLATFORM_ANALYTICS.md) | Legitimate Interest Assessment — analytics |
| [LIA_SECURITY_MONITORING.md](security/LIA_SECURITY_MONITORING.md) | Legitimate Interest Assessment — monitoring |
| [MODEL_CARDS.md](security/MODEL_CARDS.md) | AI model cards (security/compliance view) — canonical copy in docs/ai/ |
| [SESSION_26_SECURITY_AUDIT.md](security/SESSION_26_SECURITY_AUDIT.md) | Session 26 security audit findings |
| [GVISOR_SETUP.md](security/GVISOR_SETUP.md) | gVisor container sandboxing setup |
| [TDE_COLUMN_ENCRYPTION.md](security/TDE_COLUMN_ENCRYPTION.md) | Transparent data encryption setup |
| [VAULT_SETUP.md](security/VAULT_SETUP.md) | HashiCorp Vault secrets management setup |
| [MEMORY_SAFETY_PLAN.md](security/MEMORY_SAFETY_PLAN.md) | Memory safety rules and OOM prevention |
| [phase-27-security-audit.md](security/phase-27-security-audit.md) | Phase 27 security audit plan |

---

## docs/testing/ — Testing

| File | Purpose |
|------|---------|
| [TESTING_CONVENTIONS.md](testing/TESTING_CONVENTIONS.md) | Test writing patterns and conventions |
| [TEST_REGISTRY.md](testing/TEST_REGISTRY.md) | Registry of all test files and coverage |
| [E2E_TESTING.md](testing/E2E_TESTING.md) | Playwright E2E testing guide |
| [WCAG22_ACCESSIBILITY_CHECKLIST.md](testing/WCAG22_ACCESSIBILITY_CHECKLIST.md) | WCAG 2.2 accessibility checklist |
| [TEST_COVERAGE_PLAN.md](testing/TEST_COVERAGE_PLAN.md) | Test coverage targets and strategy |
| [TEST_ROUNDS_EXECUTION_PLAN.md](testing/TEST_ROUNDS_EXECUTION_PLAN.md) | Test execution rounds plan |
| [TESTING_INFRASTRUCTURE_UPGRADE_PLAN.md](testing/TESTING_INFRASTRUCTURE_UPGRADE_PLAN.md) | Testing infrastructure upgrade plan |
| [PARALLEL_TESTING_PLAN.md](testing/PARALLEL_TESTING_PLAN.md) | Parallel test execution strategy |
| [PHASE_27_QA_TEST_PLAN.md](testing/PHASE_27_QA_TEST_PLAN.md) | Phase 27 QA test plan |

---

## Quick Navigation by Role

| Role | Start Here |
|------|-----------|
| New developer | [QUICKSTART.md](development/QUICKSTART.md) → [DEVELOPMENT_GUIDELINES.md](development/DEVELOPMENT_GUIDELINES.md) |
| DevOps | [DOCKER_DEPLOYMENT.md](deployment/DOCKER_DEPLOYMENT.md) → [MONITORING.md](deployment/MONITORING.md) |
| Security | [SECURITY_PLAN.md](security/SECURITY_PLAN.md) → [SECURITY_CHECKLIST.md](security/SECURITY_CHECKLIST.md) |
| Product | [PRODUCT_REQUIREMENTS.md](product/PRODUCT_REQUIREMENTS.md) → [PROJECT_STATUS.md](project/PROJECT_STATUS.md) |
| QA | [TESTING_CONVENTIONS.md](testing/TESTING_CONVENTIONS.md) → [TEST_REGISTRY.md](testing/TEST_REGISTRY.md) |
| AI/ML | [AI_ML_PIPELINE.md](ai/AI_ML_PIPELINE.md) → [MODEL_CARDS.md](ai/MODEL_CARDS.md) |
