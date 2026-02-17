# Data Retention Policy

## 1. Overview

This Data Retention Policy defines how EduSphere handles the storage, retention, and deletion of user data in compliance with the General Data Protection Regulation (GDPR) and other applicable data protection laws.

### Key Principles

- **Data Minimization**: Collect and retain only the data necessary for legitimate business purposes
- **Storage Limitation**: Keep personal data only as long as necessary for specified purposes
- **User Rights**: Respect user rights to access, rectify, erase, and port their data
- **Accountability**: Maintain documentation of data processing activities and retention schedules
- **Security**: Ensure data is securely stored and deleted when no longer needed

### Compliance Framework

This policy ensures compliance with:
- GDPR (EU General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)
- Educational data protection requirements
- Industry best practices for data governance

## 2. Data Classification

EduSphere processes and stores the following categories of data:

### 2.1 Personal Data (PII)

Personal Identifiable Information including:
- User account details (name, email, username)
- Authentication credentials (hashed passwords, OAuth tokens)
- Profile information (avatar, bio, preferences)
- Contact information (email addresses, notification preferences)
- IP addresses and session data

**Storage Location**: PostgreSQL database, `users` table
**Sensitivity**: High

### 2.2 Learning Data

Educational content and user interactions:
- Course enrollments and progress
- Course content (documents, videos, materials)
- Annotations and highlights on content
- Assignments and submissions
- Grades and assessments
- Learning analytics and progress tracking

**Storage Location**: PostgreSQL database, S3-compatible storage for files
**Sensitivity**: Medium to High

### 2.3 System Logs

Technical logs for system operation:
- Application logs (errors, warnings, info)
- Audit logs (administrative actions, security events)
- Access logs (authentication attempts, API requests)
- AI agent execution logs

**Storage Location**: Log files, monitoring systems
**Sensitivity**: Medium

### 2.4 Analytics Data

Usage analytics and metrics:
- Page views and navigation patterns
- Feature usage statistics
- Performance metrics
- Aggregated learning analytics
- User behavior patterns

**Storage Location**: Analytics database, time-series databases
**Sensitivity**: Low (aggregated), Medium (raw)

## 3. Retention Periods

### 3.1 User Profiles
**Retention**: Account lifetime + 30 days post-deletion
**Justification**: Grace period for account recovery and audit trail

After account deletion:
- Soft delete for 30 days (recoverable)
- Hard delete after 30 days (permanent removal)

### 3.2 Course Content
**Retention**: Indefinite (with soft delete capability)
**Justification**: Educational value, institutional requirements

- Active courses: Retained indefinitely
- Deleted courses: Soft delete (marked as deleted, retained for recovery)
- Hard delete: Only upon explicit instructor request after 90-day grace period

### 3.3 Annotations and Highlights
**Retention**: Indefinite (with soft delete capability)
**Justification**: Core user-generated content with educational value

- Active annotations: Retained indefinitely
- Deleted annotations: Soft delete (30-day recovery window)
- Hard delete: Automatic purge after 30 days from soft delete

### 3.4 Audit Logs
**Retention**: 2 years
**Justification**: Security compliance, incident investigation, regulatory requirements

- Administrative actions: 2 years
- Security events: 2 years
- Access logs: 1 year
- Automatic purge after retention period

### 3.5 Application Logs
**Retention**: 90 days
**Justification**: Troubleshooting, debugging, performance monitoring

- Error logs: 90 days
- Warning logs: 60 days
- Info logs: 30 days
- Debug logs: 7 days (if enabled)

### 3.6 AI Agent Executions
**Retention**: 1 year
**Justification**: Quality assurance, model improvement, audit trail

- Execution logs: 1 year
- Input/output data: 1 year
- Performance metrics: 2 years (aggregated)
- Automatic purge after retention period

### 3.7 Analytics Data
**Retention**: Varies by type

- **Raw analytics**: 90 days
  - Individual user events
  - Detailed interaction logs
  - Session recordings (if enabled)

- **Aggregated analytics**: 2 years
  - Statistical summaries
  - Anonymized usage patterns
  - Performance benchmarks

- **Business metrics**: Indefinite
  - Fully anonymized data
  - No PII or identifiable information

### 3.8 Backups
**Retention**: 30 days
**Justification**: Disaster recovery, data protection

- Daily backups: 7 days
- Weekly backups: 30 days
- Monthly backups: Oldest deleted after 30 days
- Backup data subject to same deletion requirements as primary data

## 4. Soft Delete vs Hard Delete

### 4.1 Soft Delete

Soft delete marks records as deleted without removing them from the database.

**Implementation**:
```sql
-- Add deleted_at column to tables
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE courses ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE annotations ADD COLUMN deleted_at TIMESTAMP;

-- Soft delete query
UPDATE users SET deleted_at = NOW() WHERE id = ?;
```

**Characteristics**:
- Record remains in database with `deleted_at` timestamp
- Excluded from normal queries via WHERE clauses
- Recoverable within grace period
- Maintains referential integrity
- Preserves audit trail

**Use Cases**:
- User account deletion
- Course content removal
- Annotation deletion
- Any data requiring recovery window

### 4.2 Hard Delete

Hard delete permanently removes records from the database.

**Implementation**:
```sql
-- Permanent deletion
DELETE FROM users WHERE id = ? AND deleted_at < NOW() - INTERVAL '30 days';
```

**Characteristics**:
- Permanent and irreversible
- Frees storage space
- Complies with data minimization principles
- Requires cascading delete or orphan cleanup

**Use Cases**:
- After soft delete grace period expires
- Expired log data
- Temporary session data
- Cache and temporary files

## 5. User Rights (GDPR)

### 5.1 Right to Access (Article 15)

Users can request a copy of all their personal data.

**Implementation**:
- Self-service data export via user dashboard
- API endpoint: `GET /api/user/data-export`
- Delivery: Downloadable JSON/ZIP file
- Response time: Within 30 days of request

**Included Data**:
- Profile information
- Course enrollments and progress
- Annotations and highlights
- Submitted assignments
- Account activity logs

### 5.2 Right to Rectification (Article 16)

Users can correct inaccurate or incomplete personal data.

**Implementation**:
- Profile editing interface
- API endpoints: `PATCH /api/user/profile`
- Audit log of all modifications
- Response time: Immediate (self-service)

### 5.3 Right to Erasure (Article 17)

Users can request deletion of their personal data ("right to be forgotten").

**Implementation**:
- Self-service account deletion
- API endpoint: `DELETE /api/user/account`
- 30-day grace period with soft delete
- Hard delete after grace period
- Notification to user before hard delete

**Exceptions**:
- Legal obligations requiring retention
- Legitimate interest (e.g., fraud prevention)
- Public interest (e.g., academic research with consent)

### 5.4 Right to Data Portability (Article 20)

Users can receive their data in a structured, machine-readable format.

**Implementation**:
- Export format: JSON (standard), CSV (optional)
- API endpoint: `GET /api/user/data-export`
- Includes all user-generated content
- Response time: Within 30 days of request

**Export Structure**:
```json
{
  "user_profile": {...},
  "courses": [...],
  "annotations": [...],
  "assignments": [...],
  "export_metadata": {
    "export_date": "2026-02-17T10:00:00Z",
    "format_version": "1.0"
  }
}
```

## 6. Data Export

### 6.1 User Data Export API

**Endpoint**: `POST /api/user/data-export/request`

**Process**:
1. User requests data export
2. System generates unique export ID
3. Background job collects all user data
4. Data packaged in JSON format
5. User notified via email when ready
6. Download link valid for 7 days

**Implementation Example**:
```typescript
async function requestDataExport(userId: string) {
  const exportId = generateUUID();

  // Create export job
  await db.insert(dataExports).values({
    id: exportId,
    userId: userId,
    status: 'pending',
    requestedAt: new Date(),
  });

  // Queue background job
  await exportQueue.add('generate-export', {
    exportId,
    userId,
  });

  return exportId;
}
```

### 6.2 Export Format

**JSON Structure**:
```json
{
  "export_metadata": {
    "export_id": "uuid",
    "user_id": "uuid",
    "export_date": "ISO-8601",
    "format_version": "1.0"
  },
  "user_profile": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "ISO-8601",
    "preferences": {...}
  },
  "courses": [...],
  "annotations": [...],
  "submissions": [...],
  "activity_logs": [...]
}
```

### 6.3 Delivery Method

- **Self-Service**: Download from user dashboard
- **Secure Link**: Temporary download link via email (7-day expiration)
- **Encryption**: ZIP file with optional password protection
- **Size Limits**: Files over 1GB split into multiple archives

## 7. Data Deletion

### 7.1 User-Initiated Deletion

**Account Deletion Process**:

1. **Request**: User clicks "Delete Account" in settings
2. **Confirmation**: Multi-step confirmation with password verification
3. **Warning**: Clear explanation of consequences
4. **Soft Delete**: Account marked with `deleted_at` timestamp
5. **Grace Period**: 30 days for account recovery
6. **Notification**: Email confirmation with recovery instructions
7. **Hard Delete**: Automatic purge after 30 days

**Implementation**:
```typescript
async function deleteUserAccount(userId: string) {
  // Soft delete user
  await db.update(users)
    .set({ deleted_at: new Date() })
    .where(eq(users.id, userId));

  // Anonymize associated data
  await anonymizeUserData(userId);

  // Schedule hard delete
  await scheduleHardDelete(userId, 30); // 30 days

  // Send confirmation email
  await sendEmail({
    to: user.email,
    subject: 'Account Deletion Confirmation',
    body: 'Your account will be permanently deleted in 30 days...'
  });
}
```

### 7.2 Automated Purge

**Cleanup Jobs**:

Daily cleanup job runs at 02:00 UTC:

```sql
-- Purge soft-deleted users after 30 days
DELETE FROM users
WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '30 days';

-- Purge old application logs
DELETE FROM application_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- Purge old audit logs
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '2 years';

-- Purge old AI agent executions
DELETE FROM ai_agent_executions
WHERE created_at < NOW() - INTERVAL '1 year';

-- Purge raw analytics data
DELETE FROM analytics_events
WHERE created_at < NOW() - INTERVAL '90 days';
```

**Monitoring**:
- Log number of records deleted
- Alert if deletion fails
- Track storage space reclaimed
- Generate monthly deletion reports

### 7.3 Deletion Verification

**Verification Process**:

1. **Pre-Deletion Check**: Verify data meets deletion criteria
2. **Deletion Execution**: Execute hard delete operation
3. **Post-Deletion Verification**: Confirm data no longer exists
4. **Audit Log**: Record deletion event with timestamp and reason
5. **Compliance Report**: Generate monthly deletion summary

**Verification Query**:
```sql
-- Verify user data completely removed
SELECT
  COUNT(*) as remaining_records,
  table_name
FROM (
  SELECT 'users' as table_name FROM users WHERE id = ?
  UNION ALL
  SELECT 'courses' FROM courses WHERE user_id = ?
  UNION ALL
  SELECT 'annotations' FROM annotations WHERE user_id = ?
) AS check_tables
GROUP BY table_name;
```

## 8. Anonymization

### 8.1 When Deletion Not Possible

Anonymization is used when:
- Data required for legal/regulatory compliance
- Aggregated statistics need historical data
- Academic research requires longitudinal data
- Business analytics depend on historical trends

### 8.2 Anonymization Strategy

**Personal Data Removal**:

```typescript
async function anonymizeUserData(userId: string) {
  const anonymousId = `anon_${generateHash(userId)}`;

  // Anonymize user profile
  await db.update(users)
    .set({
      email: `${anonymousId}@anonymized.local`,
      name: 'Anonymized User',
      username: anonymousId,
      avatar_url: null,
      bio: null,
      deleted_at: new Date(),
    })
    .where(eq(users.id, userId));

  // Update analytics records
  await db.update(analyticsEvents)
    .set({ user_id: anonymousId })
    .where(eq(analyticsEvents.user_id, userId));

  // Update audit logs
  await db.update(auditLogs)
    .set({
      user_id: anonymousId,
      user_email: null,
      ip_address: null,
    })
    .where(eq(auditLogs.user_id, userId));
}
```

**Anonymization Techniques**:

1. **Pseudonymization**: Replace identifiers with pseudonyms
2. **Generalization**: Reduce precision (exact age -> age range)
3. **Data Masking**: Replace characters (email: j***@example.com)
4. **Aggregation**: Combine data into statistical summaries
5. **Hashing**: One-way hash for consistency across datasets

### 8.3 Anonymized Data Retention

**Retention Rules**:
- Anonymized analytics: Indefinite
- Anonymized audit logs: 5 years
- Aggregated statistics: Indefinite
- Research datasets: Per study protocol

**Validation**:
- Quarterly audits to verify anonymization effectiveness
- Re-identification risk assessment
- Compliance with GDPR recital 26 (anonymized data outside GDPR scope)

## 9. Backup & Archive

### 9.1 Backup Retention

**Backup Schedule**:

| Frequency | Retention | Purpose |
|-----------|-----------|---------|
| Daily | 7 days | Recent recovery |
| Weekly | 4 weeks | Short-term recovery |
| Monthly | 3 months | Medium-term recovery |

**Backup Types**:
- **Full Backup**: Complete database snapshot
- **Incremental Backup**: Changes since last backup
- **Transaction Logs**: Point-in-time recovery

**Implementation**:
```bash
# Daily backup with 7-day retention
0 2 * * * /scripts/backup-database.sh --retain-days=7

# Weekly backup with 30-day retention
0 3 * * 0 /scripts/backup-database.sh --retain-days=30
```

### 9.2 Backup Data Deletion

**Important**: Backups are subject to the same deletion requirements as primary data.

**Process**:
1. When user requests deletion, mark account for backup purge
2. Run backup sanitization job to remove user data from backups
3. Re-encrypt backups after sanitization
4. Verify user data no longer present in any backup

**Backup Sanitization Script**:
```bash
#!/bin/bash
# Extract backup, remove user data, re-compress

USER_ID=$1
BACKUP_FILE=$2

# Restore to temporary database
pg_restore -d temp_db $BACKUP_FILE

# Delete user data
psql temp_db -c "DELETE FROM users WHERE id = '$USER_ID';"

# Create sanitized backup
pg_dump temp_db > ${BACKUP_FILE}.sanitized

# Replace original backup
mv ${BACKUP_FILE}.sanitized $BACKUP_FILE
```

### 9.3 Archive Storage

**Long-Term Archives**:
- Cold storage for compliance (if required)
- Encrypted and access-controlled
- Indexed for retrieval
- Regular integrity checks

**Archive Criteria**:
- Legal hold requirements
- Regulatory compliance (e.g., financial records)
- Historical significance (institutional archives)

## 10. Automated Cleanup Jobs

### 10.1 Cron Jobs for Data Purging

**Daily Cleanup Job** (02:00 UTC):

```typescript
// cleanup-job.ts
import { CronJob } from 'cron';
import { db } from './db';
import { logger } from './logger';

const dailyCleanup = new CronJob('0 2 * * *', async () => {
  logger.info('Starting daily cleanup job');

  try {
    // Purge soft-deleted users after 30 days
    const deletedUsers = await db.execute(sql`
      DELETE FROM users
      WHERE deleted_at IS NOT NULL
        AND deleted_at < NOW() - INTERVAL '30 days'
      RETURNING id
    `);
    logger.info(`Purged ${deletedUsers.rows.length} users`);

    // Purge old application logs (90 days)
    const deletedLogs = await db.execute(sql`
      DELETE FROM application_logs
      WHERE created_at < NOW() - INTERVAL '90 days'
      RETURNING id
    `);
    logger.info(`Purged ${deletedLogs.rows.length} log entries`);

    // Purge raw analytics (90 days)
    const deletedAnalytics = await db.execute(sql`
      DELETE FROM analytics_events
      WHERE created_at < NOW() - INTERVAL '90 days'
      RETURNING id
    `);
    logger.info(`Purged ${deletedAnalytics.rows.length} analytics events`);

    // Purge expired sessions
    const deletedSessions = await db.execute(sql`
      DELETE FROM sessions
      WHERE expires_at < NOW()
      RETURNING id
    `);
    logger.info(`Purged ${deletedSessions.rows.length} expired sessions`);

  } catch (error) {
    logger.error('Daily cleanup job failed', error);
    // Alert administrators
    await sendAlert('Cleanup Job Failed', error.message);
  }
});

dailyCleanup.start();
```

**Weekly Cleanup Job** (Sunday, 03:00 UTC):

```typescript
const weeklyCleanup = new CronJob('0 3 * * 0', async () => {
  logger.info('Starting weekly cleanup job');

  try {
    // Purge old audit logs (2 years)
    const deletedAuditLogs = await db.execute(sql`
      DELETE FROM audit_logs
      WHERE created_at < NOW() - INTERVAL '2 years'
      RETURNING id
    `);
    logger.info(`Purged ${deletedAuditLogs.rows.length} audit log entries`);

    // Purge AI agent executions (1 year)
    const deletedExecutions = await db.execute(sql`
      DELETE FROM ai_agent_executions
      WHERE created_at < NOW() - INTERVAL '1 year'
      RETURNING id
    `);
    logger.info(`Purged ${deletedExecutions.rows.length} AI executions`);

    // Clean up orphaned files
    await cleanupOrphanedFiles();

    // Vacuum database
    await db.execute(sql`VACUUM ANALYZE`);

  } catch (error) {
    logger.error('Weekly cleanup job failed', error);
    await sendAlert('Weekly Cleanup Failed', error.message);
  }
});

weeklyCleanup.start();
```

### 10.2 Monitoring and Alerting

**Metrics to Track**:
- Number of records deleted per job run
- Job execution time
- Storage space reclaimed
- Job failures and errors
- Compliance with retention schedules

**Implementation**:
```typescript
interface CleanupMetrics {
  job_name: string;
  execution_time_ms: number;
  records_deleted: number;
  storage_reclaimed_mb: number;
  errors: string[];
  timestamp: Date;
}

async function recordCleanupMetrics(metrics: CleanupMetrics) {
  await db.insert(cleanupMetrics).values(metrics);

  // Send to monitoring system
  await prometheusClient.gauge('cleanup_records_deleted', metrics.records_deleted);
  await prometheusClient.gauge('cleanup_execution_time', metrics.execution_time_ms);

  // Alert on failures
  if (metrics.errors.length > 0) {
    await sendAlert('Cleanup Job Errors', JSON.stringify(metrics.errors));
  }
}
```

**Alerts**:
- Job execution failure
- Execution time exceeds threshold (> 30 minutes)
- Deletion count anomalies (too high or too low)
- Storage not being reclaimed as expected

## 11. Legal Holds

### 11.1 Legal Hold Process

When data must be preserved for legal or regulatory reasons:

**Initiation**:
1. Legal team issues legal hold request
2. Specify user/data scope and duration
3. Document reason for hold
4. Create hold record in database

**Implementation**:
```sql
-- Legal holds table
CREATE TABLE legal_holds (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  initiated_by UUID REFERENCES users(id),
  initiated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  released_at TIMESTAMP,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active' -- active, released
);

-- Place user under legal hold
INSERT INTO legal_holds (id, user_id, reason, initiated_by, notes)
VALUES (gen_random_uuid(), ?, 'Litigation hold - Case #12345', ?, 'Preserve all user data');
```

**Enforcement**:
```typescript
async function canDeleteUser(userId: string): Promise<boolean> {
  // Check for active legal holds
  const holds = await db.select()
    .from(legalHolds)
    .where(and(
      eq(legalHolds.user_id, userId),
      eq(legalHolds.status, 'active')
    ));

  if (holds.length > 0) {
    logger.warn(`Cannot delete user ${userId}: active legal hold`);
    return false;
  }

  return true;
}

async function deleteUserAccount(userId: string) {
  // Verify no legal holds
  if (!await canDeleteUser(userId)) {
    throw new Error('Cannot delete user: active legal hold');
  }

  // Proceed with deletion
  await softDeleteUser(userId);
}
```

### 11.2 Legal Hold Management

**Responsibilities**:
- Legal team: Initiates and releases holds
- Compliance officer: Reviews and approves holds
- Engineering team: Implements technical controls
- Data protection officer: Ensures GDPR compliance

**Duration**:
- Holds remain active until explicitly released
- Regular review (quarterly) of active holds
- Automatic alerts for holds exceeding 1 year

**Release Process**:
1. Legal team approves hold release
2. Update hold record with `released_at` timestamp
3. Review if data should now be deleted
4. Resume normal retention policies

## 12. Implementation

### 12.1 Database Schema Changes

**Drizzle Migration for Soft Delete**:

```typescript
// migrations/0001_add_soft_delete.ts
import { sql } from 'drizzle-orm';
import { pgTable, timestamp } from 'drizzle-orm/pg-core';

export async function up(db) {
  // Add deleted_at column to users table
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
  `);

  // Add index for performance
  await db.execute(sql`
    CREATE INDEX idx_users_deleted_at
    ON users(deleted_at)
    WHERE deleted_at IS NOT NULL;
  `);

  // Add deleted_at to other tables
  await db.execute(sql`
    ALTER TABLE courses ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
    ALTER TABLE annotations ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
    ALTER TABLE assignments ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
  `);

  // Create indexes
  await db.execute(sql`
    CREATE INDEX idx_courses_deleted_at ON courses(deleted_at) WHERE deleted_at IS NOT NULL;
    CREATE INDEX idx_annotations_deleted_at ON annotations(deleted_at) WHERE deleted_at IS NOT NULL;
    CREATE INDEX idx_assignments_deleted_at ON assignments(deleted_at) WHERE deleted_at IS NOT NULL;
  `);
}

export async function down(db) {
  await db.execute(sql`
    ALTER TABLE users DROP COLUMN deleted_at;
    ALTER TABLE courses DROP COLUMN deleted_at;
    ALTER TABLE annotations DROP COLUMN deleted_at;
    ALTER TABLE assignments DROP COLUMN deleted_at;
  `);
}
```

**Updated Schema Definitions**:

```typescript
// schema/users.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  username: varchar('username', { length: 50 }).unique(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  deleted_at: timestamp('deleted_at'), // Soft delete timestamp
});
```

### 12.2 Query Modifications

**Filter Out Soft-Deleted Records**:

```typescript
// Before: Simple query
const users = await db.select().from(usersTable);

// After: Exclude soft-deleted
const users = await db.select()
  .from(usersTable)
  .where(isNull(usersTable.deleted_at));

// Helper function
export function excludeDeleted<T extends { deleted_at?: Date }>(table: T) {
  return isNull(table.deleted_at);
}

// Usage
const activeUsers = await db.select()
  .from(usersTable)
  .where(excludeDeleted(usersTable));
```

### 12.3 Cleanup SQL Scripts

**Manual Cleanup Script** (for administrative use):

```sql
-- cleanup-expired-data.sql

-- 1. Purge soft-deleted users (30+ days)
DELETE FROM users
WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '30 days'
RETURNING id, email, deleted_at;

-- 2. Purge old application logs (90+ days)
DELETE FROM application_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- 3. Purge old audit logs (2+ years)
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '2 years'
  AND user_id NOT IN (SELECT user_id FROM legal_holds WHERE status = 'active');

-- 4. Purge AI agent executions (1+ year)
DELETE FROM ai_agent_executions
WHERE created_at < NOW() - INTERVAL '1 year';

-- 5. Purge raw analytics (90+ days)
DELETE FROM analytics_events
WHERE created_at < NOW() - INTERVAL '90 days';

-- 6. Purge expired sessions
DELETE FROM sessions
WHERE expires_at < NOW();

-- 7. Vacuum to reclaim storage
VACUUM ANALYZE;

-- 8. Generate cleanup report
SELECT
  'users' as table_name,
  COUNT(*) as records_deleted
FROM users
WHERE deleted_at < NOW() - INTERVAL '30 days'
UNION ALL
SELECT 'application_logs', COUNT(*) FROM application_logs WHERE created_at < NOW() - INTERVAL '90 days'
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';
```

**Orphaned Data Cleanup**:

```sql
-- cleanup-orphans.sql

-- Find and delete orphaned annotations (user deleted)
DELETE FROM annotations
WHERE user_id NOT IN (SELECT id FROM users WHERE deleted_at IS NULL);

-- Find and delete orphaned course enrollments
DELETE FROM enrollments
WHERE user_id NOT IN (SELECT id FROM users WHERE deleted_at IS NULL);

-- Find and delete orphaned files
DELETE FROM files
WHERE owner_id NOT IN (SELECT id FROM users WHERE deleted_at IS NULL)
  AND created_at < NOW() - INTERVAL '30 days';
```

### 12.4 Implementation Checklist

- [ ] Add `deleted_at` columns to all relevant tables
- [ ] Create indexes for soft delete queries
- [ ] Update all queries to exclude soft-deleted records
- [ ] Implement soft delete functions
- [ ] Create automated cleanup cron jobs
- [ ] Set up monitoring and alerting
- [ ] Create legal holds table and management interface
- [ ] Implement data export API
- [ ] Create anonymization functions
- [ ] Update backup processes for data deletion
- [ ] Document retention policies in user-facing terms
- [ ] Train staff on data retention procedures
- [ ] Conduct initial compliance audit

## 13. Compliance Verification

### 13.1 Quarterly Audits

**Audit Checklist**:

1. **Retention Compliance**
   - [ ] Verify data deleted per retention schedule
   - [ ] Check for data retained beyond policies
   - [ ] Review legal holds for appropriateness
   - [ ] Validate backup retention periods

2. **User Rights Compliance**
   - [ ] Test data export functionality
   - [ ] Verify account deletion process
   - [ ] Review data rectification requests
   - [ ] Check response times for user requests

3. **Technical Controls**
   - [ ] Verify cleanup jobs running successfully
   - [ ] Review deletion logs for anomalies
   - [ ] Test soft delete functionality
   - [ ] Validate anonymization effectiveness

4. **Documentation**
   - [ ] Update retention schedules if changed
   - [ ] Document any policy exceptions
   - [ ] Review and update this policy document
   - [ ] Maintain records of processing activities

**Audit Report Template**:

```markdown
# Data Retention Audit Report - Q[X] 2026

## Executive Summary
- Audit period: [Start] to [End]
- Auditor: [Name]
- Overall compliance status: [Compliant/Non-Compliant]

## Findings
### Compliant Areas
- [List compliant areas]

### Non-Compliant Areas
- [Issue 1]: Description, Impact, Remediation plan
- [Issue 2]: Description, Impact, Remediation plan

## Metrics
- Users deleted: [Count]
- Data export requests: [Count]
- Cleanup job failures: [Count]
- Storage reclaimed: [GB]

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

## Action Items
- [ ] Action item 1 - Owner: [Name], Due: [Date]
- [ ] Action item 2 - Owner: [Name], Due: [Date]
```

### 13.2 Automated Compliance Checks

**Daily Compliance Monitoring**:

```typescript
// compliance-check.ts
import { CronJob } from 'cron';
import { db } from './db';
import { logger } from './logger';

const complianceCheck = new CronJob('0 4 * * *', async () => {
  const issues: string[] = [];

  // Check 1: Data retained beyond policy
  const overdueUsers = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM users
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '35 days'
  `);

  if (overdueUsers.rows[0].count > 0) {
    issues.push(`${overdueUsers.rows[0].count} users not purged after 30-day period`);
  }

  // Check 2: Old logs not cleaned
  const oldLogs = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM application_logs
    WHERE created_at < NOW() - INTERVAL '95 days'
  `);

  if (oldLogs.rows[0].count > 0) {
    issues.push(`${oldLogs.rows[0].count} log entries exceed 90-day retention`);
  }

  // Check 3: Cleanup job failures
  const failedJobs = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM cleanup_metrics
    WHERE timestamp > NOW() - INTERVAL '1 day'
      AND errors IS NOT NULL
      AND array_length(errors, 1) > 0
  `);

  if (failedJobs.rows[0].count > 0) {
    issues.push(`${failedJobs.rows[0].count} cleanup job failures in last 24 hours`);
  }

  // Check 4: Stale legal holds
  const staleLegalHolds = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM legal_holds
    WHERE status = 'active'
      AND initiated_at < NOW() - INTERVAL '1 year'
  `);

  if (staleLegalHolds.rows[0].count > 0) {
    issues.push(`${staleLegalHolds.rows[0].count} legal holds active over 1 year - review needed`);
  }

  // Report issues
  if (issues.length > 0) {
    logger.warn('Compliance check found issues:', issues);
    await sendAlert('Data Retention Compliance Issues', issues.join('\n'));
  } else {
    logger.info('Compliance check passed: no issues found');
  }

  // Record check results
  await db.insert(complianceChecks).values({
    check_date: new Date(),
    issues_found: issues.length,
    issues: issues,
    status: issues.length === 0 ? 'passed' : 'failed',
  });
});

complianceCheck.start();
```

**Compliance Dashboard Queries**:

```sql
-- Current retention status summary
SELECT
  'Soft-deleted users (pending purge)' as metric,
  COUNT(*) as count
FROM users
WHERE deleted_at IS NOT NULL
  AND deleted_at > NOW() - INTERVAL '30 days'
UNION ALL
SELECT
  'Users overdue for purge',
  COUNT(*)
FROM users
WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '30 days'
UNION ALL
SELECT
  'Active legal holds',
  COUNT(*)
FROM legal_holds
WHERE status = 'active'
UNION ALL
SELECT
  'Data export requests (last 30 days)',
  COUNT(*)
FROM data_exports
WHERE requested_at > NOW() - INTERVAL '30 days';
```

### 13.3 Compliance Metrics

**Key Performance Indicators (KPIs)**:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Data deletion success rate | 99.9% | % of scheduled deletions completed |
| User data export response time | < 24 hours | Average time to fulfill export requests |
| Cleanup job success rate | 100% | % of cron jobs completing successfully |
| Retention policy violations | 0 | # of data retained beyond policy |
| Legal hold review frequency | Quarterly | # of reviews per year |
| Backup sanitization time | < 7 days | Days to remove user from all backups |
| Anonymization effectiveness | 100% | % of PII successfully anonymized |

**Reporting**:
- Daily: Automated compliance check results
- Weekly: Cleanup job metrics
- Monthly: User rights request fulfillment
- Quarterly: Comprehensive retention audit
- Annually: Policy review and update

---

## Document Control

**Version**: 1.0
**Last Updated**: 2026-02-17
**Next Review Date**: 2026-05-17
**Owner**: Data Protection Officer
**Approved By**: Legal & Compliance Team

**Revision History**:
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-17 | DPO Team | Initial release |

---

## Related Documents

- Privacy Policy
- GDPR Compliance Guide
- Data Processing Agreement
- Security Policy
- Incident Response Plan
- Backup and Recovery Procedures

---

## Contact

For questions about this policy, contact:
- **Data Protection Officer**: dpo@edusphere.com
- **Legal Team**: legal@edusphere.com
- **Compliance Team**: compliance@edusphere.com
