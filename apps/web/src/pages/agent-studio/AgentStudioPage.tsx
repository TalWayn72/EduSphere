/**
 * AgentStudioPage — No-Code Drag & Drop Agent Workflow Builder (G5).
 *
 * Lets instructors/admins visually compose LangGraph-style agent workflows:
 * - Left palette: draggable node types
 * - Center canvas: dropped nodes + SVG edge connections
 * - Right panel: selected-node properties editor
 * - Save: serialises to JSON and calls createAgentWorkflow mutation (or DEV mock)
 *
 * No external graph-library dependencies — uses native HTML5 DnD + SVG.
 */
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Save, Rocket } from 'lucide-react';
import { useAgentStudio } from './useAgentStudio';
import { NodePalette } from './NodePalette';
import { WorkflowCanvas } from './WorkflowCanvas';
import { PropertiesPanel } from './PropertiesPanel';

export function AgentStudioPage() {
  const { t } = useTranslation('agents');
  const {
    workflowName,
    setWorkflowName,
    nodes,
    setNodes,
    edges,
    selected,
    setSelected,
    connecting,
    saveStatus,
    canvasRef,
    selectedNode,
    handleDrop,
    handlePaletteAdd,
    handleNodeClick,
    deleteSelected,
    handleSave,
  } = useAgentStudio();

  const handleLabelChange = (nodeId: string, label: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, label } : n))
    );
  };

  return (
    <Layout>
      <PageShell size="full">
        <PageHeader title="Agent Studio" />
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-xl font-bold bg-transparent border-b border-transparent focus:border-primary focus:outline-none flex-1 min-w-0"
            aria-label="Workflow name"
            data-testid="workflow-name-input"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={saveStatus === 'saving' || nodes.length === 0}
            data-testid="save-workflow-btn"
          >
            <Save className="h-4 w-4 mr-1" />
            {saveStatus === 'saving'
              ? 'Saving\u2026'
              : saveStatus === 'saved'
                ? 'Saved \u2713'
                : t('save', 'Save')}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveStatus === 'saving' || nodes.length === 0}
            data-testid="deploy-workflow-btn"
          >
            <Rocket className="h-4 w-4 mr-1" />
            {t('deploy', 'Deploy')}
          </Button>
        </div>

        {/* Studio layout: Palette | Canvas | Properties */}
        <div className="flex gap-3 h-[calc(100vh-10rem)]">
          <NodePalette onAdd={handlePaletteAdd} />
          <WorkflowCanvas
            canvasRef={canvasRef}
            nodes={nodes}
            edges={edges}
            selected={selected}
            connecting={connecting}
            onDrop={handleDrop}
            onNodeClick={handleNodeClick}
            onCanvasClick={() => setSelected(null)}
          />
          <PropertiesPanel
            selectedNode={selectedNode}
            connecting={connecting}
            nodes={nodes}
            edges={edges}
            onLabelChange={handleLabelChange}
            onDelete={deleteSelected}
          />
        </div>
      </PageShell>
    </Layout>
  );
}
