/**
 * AgentChatPanel — the active agent chat area including header, message list,
 * quick-prompt chips, and the text input + send button.
 */
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, RotateCcw } from 'lucide-react';
import { AGENT_MODES } from './agent-modes-data';
import type { AgentModeId, AgentModeDefinition, ChatMsg } from './agent-modes';
import { RequirementLink } from '@/components/RequirementLink';

/** Extracted to module-level constant to avoid creating a new object every render. */
const PANEL_STYLE: React.CSSProperties = { height: 'calc(100vh - 22rem)' };

/** Pre-computed animation delay styles for the typing indicator dots. */
const DOT_DELAY_STYLES: React.CSSProperties[] = [
  { animationDelay: '0ms' },
  { animationDelay: '120ms' },
  { animationDelay: '240ms' },
];

interface AgentChatPanelProps {
  activeMode: AgentModeId;
  translatedMode: AgentModeDefinition;
  messages: ChatMsg[];
  chatInput: string;
  isTyping: boolean;
  streamingContent: string;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onReset: () => void;
}

export const AgentChatPanel = React.memo(function AgentChatPanel({
  activeMode,
  translatedMode,
  messages,
  chatInput,
  isTyping,
  streamingContent,
  chatEndRef,
  onInputChange,
  onSend,
  onReset,
}: AgentChatPanelProps) {
  const { t } = useTranslation('agents');
  const location = useLocation();
  const mode = AGENT_MODES.find((m) => m.id === activeMode)!;

  return (
    <Card className="flex flex-col" style={PANEL_STYLE}>
      {/* Header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b rounded-t-lg ${mode.bg}`}
      >
        <div className={mode.color}>{mode.icon}</div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{translatedMode.label}</p>
          <p className="text-xs text-muted-foreground">
            {translatedMode.description}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onReset}
        >
          <RotateCcw className="h-3 w-3 mr-1" /> {t('reset')}
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg text-sm leading-relaxed whitespace-pre-wrap
              ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-muted rounded-bl-none'
              }`}
            >
              {msg.content === 'consent-required' ? (
                <RequirementLink variant="inline" returnTo={location.pathname} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg rounded-bl-none px-4 py-3 flex gap-1 items-center">
              {DOT_DELAY_STYLES.map((style, i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                  style={style}
                />
              ))}
            </div>
          </div>
        )}
        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] bg-muted px-3 py-2 rounded-lg rounded-bl-none text-sm leading-relaxed whitespace-pre-wrap">
              {streamingContent}
              <span className="inline-block w-0.5 h-4 ml-0.5 bg-foreground/70 animate-pulse align-text-bottom" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-2 border-t border-b flex gap-2 overflow-x-auto">
        {mode.prompts.map((p) => (
          <button
            key={p}
            onClick={() => onInputChange(p)}
            className="text-xs px-2.5 py-1.5 rounded-full border bg-muted/40 hover:bg-primary/10 hover:border-primary/30 whitespace-nowrap transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-3 flex gap-2">
        <input
          value={chatInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
          placeholder={
            isTyping || streamingContent
              ? t('responding')
              : t('askAgent', { agentLabel: translatedMode.label })
          }
          disabled={isTyping || !!streamingContent}
          className="flex-1 text-sm px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
        />
        <Button
          size="sm"
          className="h-9 w-9 p-0"
          onClick={onSend}
          disabled={isTyping || !!streamingContent}
          aria-label={t('sendMessage')}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
});
