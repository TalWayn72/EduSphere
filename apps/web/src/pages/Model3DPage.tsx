/**
 * Model3DPage — displays the Model3DViewer for a 3D asset (PRD §3.3 G-1).
 * Route: /model3d/:assetId
 */
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Model3DViewer } from '@/components/Model3DViewer';

export function Model3DPage() {
  const { assetId = '' } = useParams<{ assetId: string }>();

  // In DEV_MODE or with a mock GraphQL route, the src is derived from the assetId.
  // The Model3DViewer degrades gracefully when Three.js is unavailable.
  const src = `/api/assets/${assetId}/model`;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto mt-6 p-4">
        <h1 className="text-xl font-semibold mb-4">3D Model Viewer</h1>
        <Model3DViewer src={src} className="w-full h-96" />
      </div>
    </Layout>
  );
}
