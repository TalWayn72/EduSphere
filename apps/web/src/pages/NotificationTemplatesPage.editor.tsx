import { useState } from 'react';
import { Eye, Edit2, RefreshCw, Check } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import type { NotificationTemplate } from '@/lib/graphql/admin-notifications.queries';

interface Props {
  template: NotificationTemplate;
  onSave: (id: string, subject: string, bodyHtml: string) => void;
  onReset: (id: string) => void;
  saved: boolean;
}

const ALL_VARIABLES = [
  '{{user.name}}', '{{user.email}}', '{{tenant.name}}',
  '{{tenant.logo_url}}', '{{course.title}}', '{{due_date}}',
];

export function NotificationTemplateEditor({ template, onSave, onReset, saved }: Props) {
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.bodyHtml);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');

  const insertVariable = (variable: string) => {
    setBodyHtml((prev) => prev + variable);
  };

  const handleSave = () => onSave(template.id, subject, bodyHtml);
  const handleReset = () => onReset(template.id);

  return (
    <Card className="flex-1 min-w-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{template.name}</CardTitle>
          <Badge variant="outline" className="font-mono text-xs">{template.key}</Badge>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="subject">Subject Line</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Available Variables</Label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_VARIABLES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVariable(v)}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-muted hover:bg-primary/10 hover:text-primary border border-border transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'edit' | 'preview')}>
          <TabsList className="mb-2">
            <TabsTrigger value="edit" className="gap-1.5">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Preview HTML
            </TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={10}
              className="font-mono text-xs resize-none"
              placeholder="Email body HTML..."
            />
          </TabsContent>
          <TabsContent value="preview">
            <div
              className="border rounded-md p-4 min-h-[14rem] text-sm prose prose-sm max-w-none overflow-auto"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-1">
          <Button onClick={handleSave} className="gap-1.5" size="sm">
            {saved ? <Check className="w-3.5 h-3.5" /> : null}
            {saved ? 'Saved' : 'Save Changes'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleReset}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
