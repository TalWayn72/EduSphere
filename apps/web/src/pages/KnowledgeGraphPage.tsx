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
// The courseId is forwarded to KnowledgeGraph once it accepts the prop
// (currently the component ignores it and shows the global graph).
function KnowledgeGraphPageContent() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { courseId: _courseId } = useParams<{ courseId?: string }>();
  // KnowledgeGraph is a full page component with its own Layout.
  return <KnowledgeGraph />;
}

// ─── Default export — lazy-loadable entry point ───────────────────────────────
export default function KnowledgeGraphPage() {
  return (
    <Suspense fallback={<GraphLoader />}>
      <KnowledgeGraphPageContent />
    </Suspense>
  );
}
