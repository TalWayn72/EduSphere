/**
 * useAgentStudio — state management hook for the agent studio canvas.
 */
import { useState, useCallback, useRef } from 'react';
import { useMutation } from 'urql';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TOAST_AUTO_DISMISS_MS, SIMULATED_SAVE_MS } from '@/lib/constants';
import { CREATE_AGENT_WORKFLOW_MUTATION } from '@/lib/graphql/agent.queries';
import { DEV_MODE } from '@/lib/auth';
import type { NodeType, WorkflowNode, WorkflowEdge } from './agent-studio.types';
import { NODE_META } from './agent-studio.types';

export function useAgentStudio() {
  const agentNavigate = useNavigate();
  const [workflowName, setWorkflowName] = useState('My Agent Workflow');
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const canvasRef = useRef<HTMLDivElement>(null);
  const [, execCreate] = useMutation(CREATE_AGENT_WORKFLOW_MUTATION);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nodeType') as NodeType;
    if (!type || !NODE_META[type]) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left - 60;
    const y = e.clientY - rect.top - 20;
    const id = `node-${Date.now()}`;
    setNodes((prev) => [
      ...prev,
      { id, type, label: NODE_META[type].label, x: Math.max(0, x), y: Math.max(0, y) },
    ]);
  }, []);

  const handlePaletteAdd = useCallback((type: NodeType) => {
    const id = `node-${Date.now()}`;
    const yOffset = nodes.length * 60;
    setNodes((prev) => [
      ...prev,
      { id, type, label: NODE_META[type].label, x: 40, y: 40 + yOffset },
    ]);
  }, [nodes.length]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (!connecting) {
        setConnecting(nodeId);
        setSelected(nodeId);
        return;
      }
      if (connecting === nodeId) {
        setConnecting(null);
        return;
      }
      const exists = edges.some(
        (e) => e.source === connecting && e.target === nodeId
      );
      if (!exists) {
        setEdges((prev) => [
          ...prev,
          { id: `edge-${connecting}-${nodeId}`, source: connecting, target: nodeId },
        ]);
      }
      setConnecting(null);
      setSelected(nodeId);
    },
    [connecting, edges]
  );

  const deleteSelected = () => {
    if (!selected) return;
    setNodes((prev) => prev.filter((n) => n.id !== selected));
    setEdges((prev) =>
      prev.filter((e) => e.source !== selected && e.target !== selected)
    );
    setSelected(null);
    setConnecting(null);
  };

  const handleSave = async () => {
    if (localStorage.getItem('edusphere_consent_AI_PROCESSING') !== 'true') {
      setSaveStatus('error');
      toast.error('AI features require your consent.', {
        action: {
          label: 'Enable in Settings',
          onClick: () => agentNavigate('/settings?highlight=ai-consent&returnTo=/agents/studio'),
        },
      });
      setTimeout(() => setSaveStatus('idle'), TOAST_AUTO_DISMISS_MS);
      return;
    }
    setSaveStatus('saving');
    if (!DEV_MODE) {
      const res = await execCreate({
        input: { name: workflowName, nodes, edges },
      });
      if (res.error) {
        const consentErr = res.error.graphQLErrors?.find(
          (e) => e.extensions?.code === 'CONSENT_REQUIRED'
        );
        if (consentErr) {
          console.error('[AgentStudioPage] Consent required for AI workflow save');
          setSaveStatus('error');
          toast.error('AI features require your consent.', {
            action: {
              label: 'Enable in Settings',
              onClick: () => agentNavigate('/settings?highlight=ai-consent&returnTo=/agents/studio'),
            },
          });
        } else {
          console.error('[AgentStudioPage] Save failed:', res.error.message);
          setSaveStatus('error');
        }
        setTimeout(() => setSaveStatus('idle'), TOAST_AUTO_DISMISS_MS);
        return;
      }
    }
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), SIMULATED_SAVE_MS);
  };

  const selectedNode = nodes.find((n) => n.id === selected);

  return {
    workflowName,
    setWorkflowName,
    nodes,
    setNodes,
    edges,
    selected,
    setSelected,
    connecting,
    setConnecting,
    saveStatus,
    canvasRef,
    selectedNode,
    handleDrop,
    handlePaletteAdd,
    handleNodeClick,
    deleteSelected,
    handleSave,
  };
}
