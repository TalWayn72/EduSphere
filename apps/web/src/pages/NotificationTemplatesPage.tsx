import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuthRole } from '@/hooks/useAuthRole';
import { NotificationTemplateEditor } from './NotificationTemplatesPage.editor';
import {
  ADMIN_NOTIFICATION_TEMPLATES_QUERY,
  UPDATE_NOTIFICATION_TEMPLATE_MUTATION,
  RESET_NOTIFICATION_TEMPLATE_MUTATION,
  type NotificationTemplate,
} from '@/lib/graphql/admin-notifications.queries';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

interface AdminNotificationTemplatesResult {
  adminNotificationTemplates: NotificationTemplate[];
}

export function NotificationTemplatesPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [mounted, setMounted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
    return () => {
      clearTimeout(savedTimerRef.current);
      console.error('[NotificationTemplatesPage] cleanup: saved timer cleared on unmount');
    };
  }, []);

  useEffect(() => {
    if (!role || !ADMIN_ROLES.has(role)) {
      void navigate('/dashboard');
    }
  }, [role, navigate]);

  const [{ data, fetching, error }] = useQuery<AdminNotificationTemplatesResult>({
    query: ADMIN_NOTIFICATION_TEMPLATES_QUERY,
    pause: !mounted,
  });

  const [, execUpdate] = useMutation(UPDATE_NOTIFICATION_TEMPLATE_MUTATION);
  const [, execReset] = useMutation(RESET_NOTIFICATION_TEMPLATE_MUTATION);

  if (!role || !ADMIN_ROLES.has(role)) return null;

  const templates = data?.adminNotificationTemplates ?? [];

  const selected =
    templates.find((t) => t.id === selectedId) ?? templates[0] ?? null;

  const handleSave = async (id: string, subject: string, bodyHtml: string) => {
    await execUpdate({ id, input: { subject, bodyHtml } });
    setSavedId(id);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedId(null), 2000);
  };

  const handleReset = async (id: string) => {
    await execReset({ id });
    setSavedId(null);
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    await execUpdate({ id, input: { isActive: !current } });
  };

  return (
    <AdminLayout
      title="Notification Templates"
      description="Customize email and push notification templates"
    >
      {fetching ? (
        <p className="text-sm text-muted-foreground">Loading templates...</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          Error loading templates: {error.message}
        </p>
      ) : (
        <div className="flex gap-4 items-start">
          <Card className="w-72 shrink-0">
            <CardContent className="p-2 space-y-0.5">
              {templates.map((t) => (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(t.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedId(t.id)}
                  className={`w-full text-left rounded-md px-3 py-2.5 flex items-center gap-2 transition-colors ${
                    t.id === (selectedId ?? templates[0]?.id)
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-medium truncate">
                        {t.name}
                      </span>
                      {!t.isActive && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1 py-0"
                        >
                          Off
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      {t.key}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Modified {formatDate(t.updatedAt)}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Switch
                      checked={t.isActive}
                      onCheckedChange={() => void handleToggleActive(t.id, t.isActive)}
                      className="scale-75"
                    />
                    <ChevronRight
                      className={`w-3.5 h-3.5 ${
                        t.id === (selectedId ?? templates[0]?.id)
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No templates found.
                </p>
              )}
            </CardContent>
          </Card>
          {selected && (
            <NotificationTemplateEditor
              key={selected.id}
              template={selected}
              onSave={(id, subject, bodyHtml) => void handleSave(id, subject, bodyHtml)}
              onReset={(id) => void handleReset(id)}
              saved={savedId === selected.id}
            />
          )}
        </div>
      )}
    </AdminLayout>
  );
}
