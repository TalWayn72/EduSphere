import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Filter, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { MY_ANNOTATIONS_QUERY } from '@/lib/graphql/annotation.queries';
import { DELETE_ANNOTATION_MUTATION } from '@/lib/graphql/annotation.mutations';
import { AnnotationCard, ANNOTATION_LAYER_META } from './AnnotationCard';
import { AnnotationLayer, type Annotation } from '@/types/annotations';

// Shape returned by the annotationsByUser query
interface BackendAnnotation {
  id: string;
  assetId: string;
  userId: string;
  layer: AnnotationLayer;
  annotationType: string;
  content: unknown;
  spatialData: unknown;
  parentId: string | null;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

function toAnnotation(a: BackendAnnotation, userName: string): Annotation {
  const rawContent = a.content;
  const textContent =
    typeof rawContent === 'string'
      ? rawContent
      : typeof rawContent === 'object' &&
          rawContent !== null &&
          'text' in rawContent
        ? String((rawContent as Record<string, unknown>)['text'])
        : JSON.stringify(rawContent);

  return {
    id: a.id,
    content: textContent,
    layer: a.layer,
    userId: a.userId,
    userName,
    userRole: 'student',
    timestamp: a.createdAt,
    contentId: a.assetId,
    parentId: a.parentId ?? undefined,
    replies: [],
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

function getAnnotationCountByLayer(
  annotations: Annotation[]
): Record<AnnotationLayer, number> {
  return annotations.reduce(
    (acc, ann) => {
      acc[ann.layer] = (acc[ann.layer] ?? 0) + 1;
      return acc;
    },
    {} as Record<AnnotationLayer, number>
  );
}

const ALL_LAYERS: AnnotationLayer[] = [
  AnnotationLayer.PERSONAL,
  AnnotationLayer.SHARED,
  AnnotationLayer.INSTRUCTOR,
  AnnotationLayer.AI_GENERATED,
];

// ── Delete confirmation dialog ────────────────────────────────────────────────
interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: DeleteDialogProps) {
  const { t } = useTranslation('annotations');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('deleteTitle')}</DialogTitle>
          <DialogDescription>{t('deleteConfirm')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" disabled={isDeleting}>
              {t('cancel')}
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? t('deleting') : t('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Annotation card with delete button ───────────────────────────────────────
interface AnnotationItemProps {
  ann: Annotation;
  onSeek: (contentId: string, ts?: number) => void;
  onDeleteRequest: (id: string) => void;
}

function AnnotationItem({ ann, onSeek, onDeleteRequest }: AnnotationItemProps) {
  const { t } = useTranslation('annotations');
  return (
    <div className="relative group">
      <AnnotationCard ann={ann} onSeek={onSeek} />
      <button
        onClick={() => onDeleteRequest(ann.id)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        aria-label={t('deleteAriaLabel')}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function AnnotationsPage() {
  const { t } = useTranslation('annotations');
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [sortBy, setSortBy] = useState<'time' | 'layer'>('time');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // BUG-06 fix: controlled tab state so layer summary cards can drive the Tabs
  const [activeTab, setActiveTab] = useState<string>('all');

  const [{ data, fetching, error }] = useQuery({
    query: MY_ANNOTATIONS_QUERY,
    variables: { userId: user?.id ?? '', limit: 100, offset: 0 },
    pause: !user?.id,
  });

  const [, executeDelete] = useMutation(DELETE_ANNOTATION_MUTATION);

  const backendAnnotations: BackendAnnotation[] =
    (data as { annotationsByUser?: BackendAnnotation[] } | undefined)
      ?.annotationsByUser ?? [];

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.username
    : 'Unknown';

  const annotations: Annotation[] = backendAnnotations.map((a) =>
    toAnnotation(a, displayName)
  );

  const counts = getAnnotationCountByLayer(annotations);
  const total = annotations.length;

  const sorted = (list: Annotation[]): Annotation[] => {
    if (sortBy === 'time') {
      return [...list].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }
    return [...list].sort((a, b) => a.layer.localeCompare(b.layer));
  };

  const handleSeek = (contentId: string, ts?: number) => {
    navigate(`/learn/${contentId}`, { state: { seekTo: ts } });
  };

  const handleDeleteRequest = (id: string) => {
    setPendingDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    await executeDelete({ id: pendingDeleteId });
    setIsDeleting(false);
    setPendingDeleteId(null);
    toast.success(t('annotationDeleted'));
  };

  if (fetching) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('loading')}</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <DeleteConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md border border-orange-200 bg-orange-50 text-orange-800 text-xs">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {t('loadError')}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('subtitle', { count: total })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t('sort')}:</span>
            <Button
              variant={sortBy === 'time' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSortBy('time')}
            >
              {t('sortByTime')}
            </Button>
            <Button
              variant={sortBy === 'layer' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSortBy('layer')}
            >
              {t('sortByLayer')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ALL_LAYERS.map((layer) => {
            const meta = ANNOTATION_LAYER_META[layer];
            const isSelected = activeTab === layer;
            return (
              <Card
                key={layer}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onClick={() => setActiveTab(layer)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setActiveTab(layer);
                }}
                className={[
                  'border cursor-pointer transition-all select-none',
                  meta.bg,
                  isSelected
                    ? 'ring-2 ring-offset-2 ring-primary shadow-md'
                    : 'hover:shadow-sm hover:brightness-95',
                ].join(' ')}
              >
                <CardContent className="p-3 text-center">
                  <p className="text-2xl">{meta.icon}</p>
                  <p className={`text-lg font-bold ${meta.color}`}>
                    {counts[layer] ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">{meta.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              {t('all')} ({total})
            </TabsTrigger>
            {ALL_LAYERS.map((layer) => (
              <TabsTrigger key={layer} value={layer}>
                {ANNOTATION_LAYER_META[layer].icon}{' '}
                {ANNOTATION_LAYER_META[layer].label} ({counts[layer] ?? 0})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {sorted(annotations).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">
                {t('noAnnotations')}
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {sorted(annotations).map((ann) => (
                  <AnnotationItem
                    key={ann.id}
                    ann={ann}
                    onSeek={handleSeek}
                    onDeleteRequest={handleDeleteRequest}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {ALL_LAYERS.map((layer) => (
            <TabsContent key={layer} value={layer} className="mt-4">
              <div className="grid md:grid-cols-2 gap-3">
                {sorted(annotations.filter((a) => a.layer === layer)).map(
                  (ann) => (
                    <AnnotationItem
                      key={ann.id}
                      ann={ann}
                      onSeek={handleSeek}
                      onDeleteRequest={handleDeleteRequest}
                    />
                  )
                )}
                {annotations.filter((a) => a.layer === layer).length === 0 && (
                  <p className="col-span-2 text-center text-sm text-muted-foreground py-8">
                    {t('noLayerAnnotations', {
                      layer: ANNOTATION_LAYER_META[layer].label.toLowerCase(),
                    })}
                  </p>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}
