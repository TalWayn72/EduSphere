import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockAnnotations, getAnnotationCountByLayer } from '@/lib/mock-annotations';
import { Annotation, AnnotationLayer } from '@/types/annotations';
import { Clock, PlayCircle, MessageSquare, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LAYER_META: Record<AnnotationLayer, { label: string; color: string; bg: string; icon: string }> = {
  [AnnotationLayer.PERSONAL]:     { label: 'Personal',   color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', icon: '🔒' },
  [AnnotationLayer.SHARED]:       { label: 'Shared',     color: 'text-blue-700',   bg: 'bg-blue-50   border-blue-200',   icon: '👥' },
  [AnnotationLayer.INSTRUCTOR]:   { label: 'Instructor', color: 'text-green-700',  bg: 'bg-green-50  border-green-200',  icon: '🎓' },
  [AnnotationLayer.AI_GENERATED]: { label: 'AI',         color: 'text-amber-700',  bg: 'bg-amber-50  border-amber-200',  icon: '🤖' },
};

function formatTimestamp(ts?: number): string {
  if (!ts) return '';
  const m = Math.floor(ts / 60);
  const s = Math.floor(ts % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function AnnotationCard({ ann, onSeek }: { ann: Annotation; onSeek: (id: string, ts?: number) => void }) {
  const meta = LAYER_META[ann.layer];
  return (
    <div className={`p-3 rounded-md border text-sm space-y-1.5 ${meta.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span>{meta.icon}</span>
          <span className={`text-xs font-semibold ${meta.color}`}>{ann.userName}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color} border text-[10px]`}>
            {meta.label}
          </span>
        </div>
        {ann.contentTimestamp !== undefined && (
          <button
            onClick={() => onSeek(ann.contentId, ann.contentTimestamp)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Clock className="h-3 w-3" />
            {formatTimestamp(ann.contentTimestamp)}
            <PlayCircle className="h-3 w-3" />
          </button>
        )}
      </div>
      <p className="leading-snug text-xs">{ann.content}</p>
      {ann.replies && ann.replies.length > 0 && (
        <div className="ml-3 pt-1.5 border-l-2 border-current/20 pl-3 space-y-1">
          {ann.replies.map((reply: Annotation) => (
            <div key={reply.id} className="text-xs text-muted-foreground">
              <span className="font-medium">{reply.userName}: </span>{reply.content}
            </div>
          ))}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            {ann.replies.length} {ann.replies.length === 1 ? 'reply' : 'replies'}
          </div>
        </div>
      )}
    </div>
  );
}

export function AnnotationsPage() {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<'time' | 'layer'>('time');

  const counts = getAnnotationCountByLayer(mockAnnotations);
  const allLayers = [AnnotationLayer.PERSONAL, AnnotationLayer.SHARED, AnnotationLayer.INSTRUCTOR, AnnotationLayer.AI_GENERATED];

  const handleSeek = (contentId: string, ts?: number) => {
    navigate(`/learn/${contentId}`, { state: { seekTo: ts } });
  };

  const sortedAnnotations = (annotations: Annotation[]) => {
    if (sortBy === 'time') return [...annotations].sort((a, b) => (a.contentTimestamp ?? 0) - (b.contentTimestamp ?? 0));
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
              All your annotations across {Object.values(counts).reduce((a, b) => a + b, 0)} notes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Sort:</span>
            <Button
              variant={sortBy === 'time' ? 'default' : 'ghost'}
              size="sm" className="h-7 text-xs"
              onClick={() => setSortBy('time')}
            >By time</Button>
            <Button
              variant={sortBy === 'layer' ? 'default' : 'ghost'}
              size="sm" className="h-7 text-xs"
              onClick={() => setSortBy('layer')}
            >By layer</Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {allLayers.map((layer) => {
            const meta = LAYER_META[layer];
            return (
              <Card key={layer} className={`border ${meta.bg}`}>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl">{meta.icon}</p>
                  <p className={`text-lg font-bold ${meta.color}`}>{counts[layer] ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{meta.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs by layer */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({mockAnnotations.length})</TabsTrigger>
            {allLayers.map((layer) => (
              <TabsTrigger key={layer} value={layer}>
                {LAYER_META[layer].icon} {LAYER_META[layer].label} ({counts[layer] ?? 0})
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
                {sortedAnnotations(mockAnnotations.filter((a) => a.layer === layer)).map((ann) => (
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
