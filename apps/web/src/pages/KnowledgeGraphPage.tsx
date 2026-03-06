import { Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { KnowledgeGraph } from './KnowledgeGraph';

// ─── Loading fallback ─────────────────────────────────────────────────────────
function GraphLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

// ─── Inner content — reads optional :courseId from route params ───────────────
// KnowledgeGraph is a self-contained page (owns its <Layout> wrapper).
// KnowledgeGraphPage is a thin routing adapter that reads the optional
// :courseId param so the same component can be reached at both
//   /knowledge-graph
//   /knowledge-graph/:courseId
// The courseId is forwarded to KnowledgeGraph which shows course-filtered
// view when present, or the global "All Knowledge" graph when absent.
function KnowledgeGraphPageContent() {
  const { courseId } = useParams<{ courseId?: string }>();
  return <KnowledgeGraph courseId={courseId} />;
}

// ─── Default export — lazy-loadable entry point ───────────────────────────────
export default function KnowledgeGraphPage() {
  return (
    <Suspense fallback={<GraphLoader />}>
      <KnowledgeGraphPageContent />
    </Suspense>
  );
}
