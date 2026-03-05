/**
 * NotificationTemplatesService — CRUD for admin-configurable notification templates.
 * Templates are stored in DB; defaults are seeded once on first access.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { db, notificationTemplates, closeAllPools } from '@edusphere/db';
import { sql, eq, and } from 'drizzle-orm';

export interface TemplateRow {
  id: string;
  key: string;
  name: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
  isActive: boolean;
  updatedAt: string;
}

interface UpdateInput {
  subject?: string;
  bodyHtml?: string;
  isActive?: boolean;
}

const PLATFORM_DEFAULTS: Omit<TemplateRow, 'id' | 'updatedAt'>[] = [
  {
    key: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to {{tenant.name}}!',
    bodyHtml:
      '<h2>Welcome to {{tenant.name}}!</h2><p>Hi {{user.name}},</p><p>Your account is ready. <a href="#">Get started</a>.</p>',
    variables: ['user.name', 'tenant.name'],
    isActive: true,
  },
  {
    key: 'enrollment_confirmation',
    name: 'Enrollment Confirmation',
    subject: "You're enrolled in {{course.title}}",
    bodyHtml:
      '<h2>Enrollment Confirmed</h2><p>Hi {{user.name}},</p><p>You are now enrolled in <strong>{{course.title}}</strong>.</p>',
    variables: ['user.name', 'course.title'],
    isActive: true,
  },
  {
    key: 'completion_certificate',
    name: 'Completion Certificate',
    subject: 'Congratulations! Certificate Ready',
    bodyHtml:
      '<h2>Well done, {{user.name}}!</h2><p>You have completed <strong>{{course.title}}</strong>. Your certificate is ready.</p>',
    variables: ['user.name', 'course.title'],
    isActive: true,
  },
  {
    key: 'compliance_reminder',
    name: 'Compliance Reminder',
    subject: 'Compliance Training Due: {{course.title}}',
    bodyHtml:
      '<h2>Action Required</h2><p>Hi {{user.name}},</p><p><strong>{{course.title}}</strong> is due by <strong>{{due_date}}</strong>.</p>',
    variables: ['user.name', 'course.title', 'due_date'],
    isActive: true,
  },
  {
    key: 'password_reset',
    name: 'Password Reset',
    subject: 'Reset your password',
    bodyHtml:
      '<h2>Password Reset Request</h2><p>Hi {{user.name}},</p><p>Click <a href="#">here</a> to reset your password. This link expires in 1 hour.</p>',
    variables: ['user.name', 'user.email'],
    isActive: true,
  },
  {
    key: 'at_risk_intervention',
    name: 'At-Risk Intervention',
    subject: 'We miss you, {{user.name}}!',
    bodyHtml:
      '<h2>We miss you!</h2><p>Hi {{user.name}},</p><p>We noticed you have not logged in recently. Come back to <strong>{{tenant.name}}</strong>.</p>',
    variables: ['user.name', 'tenant.name'],
    isActive: false,
  },
];

function mapRow(row: typeof notificationTemplates.$inferSelect): TemplateRow {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    subject: row.subject,
    bodyHtml: row.bodyHtml,
    variables: Array.isArray(row.variables) ? (row.variables as string[]) : [],
    isActive: row.isActive,
    updatedAt: row.updatedAt instanceof Date
      ? row.updatedAt.toISOString()
      : String(row.updatedAt),
  };
}

@Injectable()
export class NotificationTemplatesService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationTemplatesService.name);

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[NotificationTemplatesService] DB pools closed');
  }

  async getTemplates(tenantId: string): Promise<TemplateRow[]> {
    try {
      await this.seedDefaults(tenantId);
      const rows = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.tenantId, tenantId))
        .orderBy(notificationTemplates.name);
      return rows.map(mapRow);
    } catch (err) {
      this.logger.error({ tenantId, err }, 'Failed to fetch notification templates');
      throw err;
    }
  }

  async updateTemplate(
    id: string,
    input: UpdateInput,
    tenantId: string
  ): Promise<TemplateRow> {
    const patch: Partial<typeof notificationTemplates.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.subject != null) patch.subject = input.subject;
    if (input.bodyHtml != null) patch.bodyHtml = input.bodyHtml;
    if (input.isActive != null) patch.isActive = input.isActive;

    const [row] = await db
      .update(notificationTemplates)
      .set(patch)
      .where(
        and(
          eq(notificationTemplates.id, id),
          eq(notificationTemplates.tenantId, tenantId)
        )
      )
      .returning();
    if (!row) throw new Error(`Notification template ${id} not found`);
    this.logger.log({ id, tenantId }, 'Notification template updated');
    return mapRow(row);
  }

  async resetTemplate(id: string, tenantId: string): Promise<TemplateRow> {
    const currentRow = await db
      .select({ key: notificationTemplates.key })
      .from(notificationTemplates)
      .where(
        and(
          eq(notificationTemplates.id, id),
          eq(notificationTemplates.tenantId, tenantId)
        )
      )
      .limit(1);
    const templateKey = currentRow[0]?.key;
    if (!templateKey) throw new Error(`Notification template ${id} not found`);

    const defaults = PLATFORM_DEFAULTS.find((d) => d.key === templateKey);
    if (!defaults) throw new Error(`No defaults found for key ${templateKey}`);

    const [row] = await db
      .update(notificationTemplates)
      .set({
        subject: defaults.subject,
        bodyHtml: defaults.bodyHtml,
        isActive: defaults.isActive,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notificationTemplates.id, id),
          eq(notificationTemplates.tenantId, tenantId)
        )
      )
      .returning();
    if (!row) throw new Error(`Reset failed for template ${id}`);
    this.logger.log({ id, tenantId, key: templateKey }, 'Notification template reset to defaults');
    return mapRow(row);
  }

  private async seedDefaults(tenantId: string): Promise<void> {
    try {
      for (const def of PLATFORM_DEFAULTS) {
        await db.execute(sql`
          INSERT INTO notification_templates (tenant_id, key, name, subject, body_html, variables, is_active)
          VALUES (
            ${tenantId}::uuid,
            ${def.key},
            ${def.name},
            ${def.subject},
            ${def.bodyHtml},
            ${JSON.stringify(def.variables)}::jsonb,
            ${def.isActive}
          )
          ON CONFLICT (tenant_id, key) DO NOTHING
        `);
      }
    } catch (err) {
      this.logger.warn({ tenantId, err }, 'Notification template seed skipped');
    }
  }
}
