/**
 * AgentModeSelector — grid of agent mode cards that switch the active mode.
 */
import React from 'react';
import type { AgentModeDefinition, AgentModeId } from './agent-modes';

interface AgentModeSelectorProps {
  modes: AgentModeDefinition[];
  activeMode: AgentModeId;
  onSelect: (mode: AgentModeId) => void;
}

export const AgentModeSelector = React.memo(function AgentModeSelector({
  modes,
  activeMode,
  onSelect,
}: AgentModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id as AgentModeId)}
          className={`p-3 rounded-xl border text-left transition-all ${
            activeMode === m.id
              ? `${m.bg} ring-2 ring-primary shadow-sm`
              : 'border-muted hover:border-primary/40 hover:bg-muted/30'
          }`}
        >
          <div className={`mb-2 ${m.color}`}>{m.icon}</div>
          <p className="text-xs font-semibold leading-tight">{m.label}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-tight line-clamp-2">
            {m.description}
          </p>
        </button>
      ))}
    </div>
  );
});
