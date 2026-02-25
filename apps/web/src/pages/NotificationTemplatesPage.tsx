import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuthRole } from '@/hooks/useAuthRole';
import { NotificationTemplateEditor } from './NotificationTemplatesPage.editor';
import type { NotificationTemplate } from '@/lib/graphql/admin-notifications.queries';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const DEFAULTS: NotificationTemplate[] = [
  { id: '1', key: 'welcome', name: 'Welcome Email', subject: 'Welcome to {{tenant.name}}!',
    bodyHtml: '<h2>Welcome to {{tenant.name}}!</h2><p>Hi {{user.name}},</p><p>Your account is ready. <a href="#">Get started</a>.</p>',
    variables: ['user.name', 'tenant.name'], isActive: true, updatedAt: '2026-02-01T10:00:00Z' },
  { id: '2', key: 'enrollment_confirmation', name: 'Enrollment Confirmation', subject: "You're enrolled in {{course.title}}",
    bodyHtml: '<h2>Enrollment Confirmed</h2><p>Hi {{user.name}},</p><p>You are now enrolled in <strong>{{course.title}}</strong>.</p>',
    variables: ['user.name', 'course.title'], isActive: true, updatedAt: '2026-02-05T09:00:00Z' },
  { id: '3', key: 'completion_certificate', name: 'Completion Certificate', subject: 'Congratulations! Certificate Ready',
    bodyHtml: '<h2>Well done, {{user.name}}!</h2><p>You have completed <strong>{{course.title}}</strong>. Your certificate is ready.</p>',
    variables: ['user.name', 'course.title'], isActive: true, updatedAt: '2026-02-10T14:30:00Z' },
  { id: '4', key: 'compliance_reminder', name: 'Compliance Reminder', subject: 'Compliance Training Due: {{course.title}}',
    bodyHtml: '<h2>Action Required</h2><p>Hi {{user.name}},</p><p><strong>{{course.title}}</strong> is due by <strong>{{due_date}}</strong>.</p>',
    variables: ['user.name', 'course.title', 'due_date'], isActive: true, updatedAt: '2026-02-12T08:00:00Z' },
  { id: '5', key: 'password_reset', name: 'Password Reset', subject: 'Reset your password',
    bodyHtml: '<h2>Password Reset Request</h2><p>Hi {{user.name}},</p><p>Click <a href="#">here</a> to reset your password. This link expires in 1 hour.</p>',
    variables: ['user.name', 'user.email'], isActive: true, updatedAt: '2026-01-28T11:00:00Z' },
  { id: '6', key: 'at_risk_intervention', name: 'At-Risk Intervention', subject: "We miss you, {{user.name}}!",
    bodyHtml: '<h2>We miss you!</h2><p>Hi {{user.name}},</p><p>We noticed you have not logged in recently. Come back and continue your learning journey on <strong>{{tenant.name}}</strong>.</p>',
    variables: ['user.name', 'tenant.name'], isActive: false, updatedAt: '2026-02-15T16:00:00Z' },
];

export function NotificationTemplatesPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [templates, setTemplates] = useState<NotificationTemplate[]>(DEFAULTS);
  const [selectedId, setSelectedId] = useState<string>(DEFAULTS[0]!.id);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (!role || !ADMIN_ROLES.has(role)) { void navigate('/dashboard'); }
  }, [role, navigate]);

  if (!role || !ADMIN_ROLES.has(role)) return null;

  const selected = templates.find((t) => t.id === selectedId) ?? templates[0];
  if (!selected) return null;

  const toggleActive = (id: string) =>
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, isActive: !t.isActive } : t));

  const handleSave = (id: string, subject: string, bodyHtml: string) => {
    setTemplates((prev) => prev.map((t) =>
      t.id === id ? { ...t, subject, bodyHtml, updatedAt: new Date().toISOString() } : t
    ));
    setSavedId(id);
    setTimeout(() => setSavedId(null), 2000);
  };

  const handleReset = (id: string) => {
    const def = DEFAULTS.find((d) => d.id === id);
    if (!def) return;
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...def, updatedAt: new Date().toISOString() } : t));
    setSavedId(null);
  };

  return (
    <AdminLayout title="Notification Templates" description="Customize email and push notification templates">
      <div className="flex gap-4 items-start">
        <Card className="w-72 shrink-0">
          <CardContent className="p-2 space-y-0.5">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left rounded-md px-3 py-2.5 flex items-center gap-2 transition-colors ${
                  t.id === selectedId ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-medium truncate">{t.name}</span>
                    {!t.isActive && <Badge variant="secondary" className="text-[10px] px-1 py-0">Off</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">{t.key}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Modified {formatDate(t.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Switch checked={t.isActive} onCheckedChange={() => toggleActive(t.id)} className="scale-75" />
                  <ChevronRight className={`w-3.5 h-3.5 ${t.id === selectedId ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
        <NotificationTemplateEditor
          key={selected.id}
          template={selected}
          onSave={handleSave}
          onReset={handleReset}
          saved={savedId === selected.id}
        />
      </div>
    </AdminLayout>
  );
}
