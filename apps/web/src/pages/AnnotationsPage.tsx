import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  mockAnnotations,
  getAnnotationCountByLayer,
} from '@/lib/mock-annotations';
import { Annotation, AnnotationLayer } from '@/types/annotations';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AnnotationCard,
  ANNOTATION_LAYER_META,
} from './AnnotationCard';

export function AnnotationsPage() {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<'time' | 'layer'>('time');

  const counts = getAnnotationCountByLayer(mockAnnotations);
  const allLayers = [
    AnnotationLayer.PERSONAL,
    AnnotationLayer.SHARED,
    AnnotationLayer.INSTRUCTOR,
    AnnotationLayer.AI_GENERATED,
  ];

  const handleSeek = (contentId: string, ts?: number) => {
    navigate(`/learn/${contentId}`, { state: { seekTo: ts } });
  };

  const sortedAnnotations = (annotations: Annotation[]) => {
    if (sortBy === 'time')
      return [...annotations].sort(
        (a, b) => (a.contentTimestamp ?? 0) - (b.contentTimestamp ?? 0)
      );
    return annotations;
  };

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Annotations</h1>
            <p className="text-sm text-muted-foreground">
              All your annotations across{' '}
              {Object.values(counts).reduce((a, b) => a + b, 0)} notes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Sort:</span>
            <Button
              variant={sortBy === 'time' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSortBy('time')}
            >
              By time
            </Button>
            <Button
              variant={sortBy === 'layer' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSortBy('layer')}
            >
              By layer
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {allLayers.map((layer) => {
            const meta = ANNOTATION_LAYER_META[layer];
            return (
              <Card key={layer} className={`border ${meta.bg}`}>
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

        {/* Tabs by layer */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">
              All ({mockAnnotations.length})
            </TabsTrigger>
            {allLayers.map((layer) => (
              <TabsTrigger key={layer} value={layer}>
                {ANNOTATION_LAYER_META[layer].icon} {ANNOTATION_LAYER_META[layer].label} (
                {counts[layer] ?? 0})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="grid md:grid-cols-2 gap-3">
              {sortedAnnotations(mockAnnotations).map((ann) => (
                <AnnotationCard key={ann.id} ann={ann} onSeek={handleSeek} />
              ))}
            </div>
          </TabsContent>

          {allLayers.map((layer) => (
            <TabsContent key={layer} value={layer} className="mt-4">
              <div className="grid md:grid-cols-2 gap-3">
                {sortedAnnotations(
                  mockAnnotations.filter((a) => a.layer === layer)
                ).map((ann) => (
                  <AnnotationCard key={ann.id} ann={ann} onSeek={handleSeek} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}
