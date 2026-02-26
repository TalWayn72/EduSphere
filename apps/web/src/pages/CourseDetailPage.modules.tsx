/**
 * CourseModuleList — expandable module + content item list for CourseDetailPage.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  Play,
  FileText,
  Headphones,
  BookOpen,
  HelpCircle,
  Link,
  PenSquare,
} from 'lucide-react';

interface ContentItemSummary {
  id: string;
  title: string;
  contentType: string;
  duration: number | null;
  orderIndex: number;
}

interface ModuleSummary {
  id: string;
  title: string;
  orderIndex: number;
  contentItems: ContentItemSummary[];
}

interface Props {
  modules: ModuleSummary[];
  courseId: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function ContentTypeIcon({ type }: { type: string }) {
  switch (type.toUpperCase()) {
    case 'VIDEO':
      return <Play className="h-3.5 w-3.5 text-blue-500" />;
    case 'AUDIO':
      return <Headphones className="h-3.5 w-3.5 text-purple-500" />;
    case 'PDF':
      return <FileText className="h-3.5 w-3.5 text-red-500" />;
    case 'MARKDOWN':
      return <BookOpen className="h-3.5 w-3.5 text-green-500" />;
    case 'QUIZ':
      return <HelpCircle className="h-3.5 w-3.5 text-orange-500" />;
    case 'ASSIGNMENT':
      return <PenSquare className="h-3.5 w-3.5 text-yellow-600" />;
    case 'LINK':
      return <Link className="h-3.5 w-3.5 text-cyan-500" />;
    default:
      return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

interface ModuleCardProps {
  mod: ModuleSummary;
  defaultOpen: boolean;
  courseId: string;
}

function ModuleCard({ mod, defaultOpen, courseId }: ModuleCardProps) {
  const { t } = useTranslation('courses');
  const navigate = useNavigate();
  const [open, setOpen] = useState(defaultOpen);

  const navigateToItem = (itemId: string) => {
    const params = new URLSearchParams({ courseId });
    navigate(`/learn/${itemId}?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none py-3"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {open ? (
              <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            )}
            <CardTitle className="text-base font-semibold truncate">
              {mod.title}
            </CardTitle>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {mod.contentItems.length} item
            {mod.contentItems.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 pb-2">
          {mod.contentItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 px-2">
              {t('noContentItems')}
            </p>
          ) : (
            <ul className="space-y-1">
              {mod.contentItems.map((item) => (
                <li key={item.id}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 h-9 px-2 text-sm font-normal"
                    onClick={() => navigateToItem(item.id)}
                  >
                    <ContentTypeIcon type={item.contentType} />
                    <span className="flex-1 truncate text-left">
                      {item.title}
                    </span>
                    {item.duration && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDuration(item.duration)}
                      </span>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function CourseModuleList({ modules, courseId }: Props) {
  const { t } = useTranslation('courses');

  if (modules.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t('noModulesAdded')}
        </CardContent>
      </Card>
    );
  }

  const sorted = [...modules].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{t('courseContent')}</h2>
      {sorted.map((mod, idx) => (
        <ModuleCard
          key={mod.id}
          mod={mod}
          defaultOpen={idx === 0}
          courseId={courseId}
        />
      ))}
    </div>
  );
}
