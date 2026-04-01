/**
 * AnnotationsPage — user's annotation dashboard with layer tabs.
 */
import { useState, useOptimistic, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Filter, Loader2, AlertCircle } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { MY_ANNOTATIONS_QUERY } from '@/lib/graphql/annotation.queries';
import { DELETE_ANNOTATION_MUTATION } from '@/lib/graphql/annotation.mutations';
import { ANNOTATION_LAYER_META } from '@/pages/AnnotationCard';
import type { Annotation } from '@/types/annotations';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { AnnotationItem } from './AnnotationItem';
import {
  type BackendAnnotation,
  toAnnotation,
  getAnnotationCountByLayer,
  ALL_LAYERS,
} from './annotations-helpers';

export function AnnotationsPage() {
  const { t } = useTranslation('annotations');
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [sortBy, setSortBy] = useState<'time' | 'layer'>('time');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
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

  const serverAnnotations: Annotation[] = backendAnnotations.map((a) =>
    toAnnotation(a, displayName)
  );

  const [annotations, removeOptimisticAnnotation] = useOptimistic(
    serverAnnotations,
    (state: Annotation[], deletedId: string) =>
      state.filter((a) => a.id !== deletedId)
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

  const handleDeleteConfirm = () => {
    if (!pendingDeleteId) return;
    const idToDelete = pendingDeleteId;
    setPendingDeleteId(null);
    startDeleteTransition(async () => {
      removeOptimisticAnnotation(idToDelete);
      const { error: deleteErr } = await executeDelete({ id: idToDelete });
      if (deleteErr) {
        console.error(
          '[AnnotationsPage] delete annotation failed:',
          deleteErr.message,
          deleteErr
        );
        toast.error(t('deleteError', 'Failed to delete annotation'));
        return;
      }
      toast.success(t('annotationDeleted'));
    });
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
          <div className="flex items-center gap-2 p-3 rounded-md border border-orange-200 bg-orange-50 text-orange-800 text-xs dark:border-orange-700 dark:bg-orange-950 dark:text-orange-200">
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
                    onDeleteRequest={(id) => setPendingDeleteId(id)}
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
                      onDeleteRequest={(id) => setPendingDeleteId(id)}
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
