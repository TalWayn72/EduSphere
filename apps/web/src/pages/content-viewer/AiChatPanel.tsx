/** Right column: AI Chavruta chat panel. */
import React, { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Send, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { RequirementLink } from '@/components/RequirementLink';

/** Pre-computed animation delay styles for the typing indicator dots. */
const DOT_DELAY_STYLES: React.CSSProperties[] = [
  { animationDelay: '0ms' },
  { animationDelay: '120ms' },
  { animationDelay: '240ms' },
];

export interface SourceAttribution {
  sourceId: string;
  sourceName: string;
  similarity: number;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  sources?: SourceAttribution[];
}

export interface AiChatPanelProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  isStreaming: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  onChatInputChange: (value: string) => void;
  onSendChat: () => void;
  onSourceClick?: (sourceId: string) => void;
}

const QUICK_PROMPTS = [
  'Debate free will',
  'Quiz me',
  'Summarize',
  'Explain Rambam',
];
const CHAT_MODES = ['CHAVRUTA', 'QUIZ', 'EXPLAIN'];

export const AiChatPanel = React.memo(function AiChatPanel({
  chatMessages,
  chatInput,
  isStreaming,
  chatEndRef,
  onChatInputChange,
  onSendChat,
  onSourceClick,
}: AiChatPanelProps) {
  const { t } = useTranslation(['content']);
  const location = useLocation();
  const [expandedSources, setExpandedSources] = useState<Set<string>>(
    new Set()
  );

  const toggleSources = useCallback((msgId: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }, []);

  return (
    <div className="col-span-12 lg:col-span-3 flex flex-col overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2 border-b flex items-center gap-2 flex-shrink-0">
          <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">{t('content:chavrutaAi')}</p>
            <p className="text-xs text-muted-foreground">
              {t('content:dialecticalPartner')}
            </p>
          </div>
          <div
            className="ml-auto flex gap-1"
            role="group"
            aria-label={t('content:chatModes', 'Chat modes')}
          >
            {CHAT_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-label={`${mode} mode`}
                className="text-xs px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          role="log"
          aria-label={t('content:chatMessages', 'Chat messages')}
          aria-live="polite"
        >
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed
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
              {msg.sources && msg.sources.length > 0 && (
                <div className="max-w-[85%] mt-1">
                  <button
                    onClick={() => toggleSources(msg.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`sources-toggle-${msg.id}`}
                    aria-expanded={expandedSources.has(msg.id)}
                    aria-label={t('content:toggleSources', {
                      count: msg.sources.length,
                      defaultValue: 'Toggle {{count}} source references',
                    })}
                  >
                    <FileText className="h-3 w-3" aria-hidden="true" />
                    {t('content:sourcesCount', {
                      count: msg.sources.length,
                      defaultValue: '{{count}} sources',
                    })}
                    {expandedSources.has(msg.id) ? (
                      <ChevronUp className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-3 w-3" aria-hidden="true" />
                    )}
                  </button>
                  {expandedSources.has(msg.id) && (
                    <ul
                      className="mt-1 space-y-1 border rounded-md p-2 bg-background"
                      data-testid={`sources-list-${msg.id}`}
                    >
                      {msg.sources.map((src) => (
                        <li
                          key={src.sourceId}
                          className="flex items-center justify-between text-xs"
                        >
                          <button
                            onClick={() => onSourceClick?.(src.sourceId)}
                            className="text-primary hover:underline truncate max-w-[70%] text-left"
                            aria-label={`${t('content:viewSource', 'View source')}: ${src.sourceName} (${Math.round(src.similarity * 100)}% ${t('content:relevance', 'relevance')})`}
                          >
                            {src.sourceName}
                          </button>
                          <span className="text-muted-foreground shrink-0 ml-2">
                            {Math.round(src.similarity * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
          {isStreaming && (
            <div
              className="flex justify-start"
              role="status"
              aria-label={t('content:aiTyping', 'AI is responding')}
            >
              <div
                className="bg-muted rounded-lg rounded-bl-none px-4 py-3 flex gap-1 items-center"
                aria-hidden="true"
              >
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
          <div ref={chatEndRef} />
        </div>

        {/* Quick prompts */}
        <div
          className="px-4 py-2 border-t border-b flex gap-2 overflow-x-auto flex-shrink-0"
          role="group"
          aria-label={t('content:quickPrompts', 'Quick prompts')}
        >
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onChatInputChange(prompt)}
              aria-label={`${t('content:usePrompt', 'Use prompt')}: ${prompt}`}
              className="text-xs px-2 py-1 rounded-full border bg-muted/40 hover:bg-primary/10 hover:border-primary/30 whitespace-nowrap transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-3 flex gap-2 flex-shrink-0">
          <input
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            onKeyDown={(e) =>
              e.key === 'Enter' && !e.shiftKey && !isStreaming && onSendChat()
            }
            placeholder={
              isStreaming
                ? t('content:agentResponding')
                : t('content:askOrDebate')
            }
            disabled={isStreaming}
            aria-label={t(
              'content:chatInputLabel',
              'Type your message to the AI'
            )}
            className="flex-1 text-sm px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <Button
            size="sm"
            className="h-9 w-9 p-0 flex-shrink-0"
            onClick={onSendChat}
            disabled={isStreaming}
            aria-label={t('content:sendMessage', 'Send message')}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </Card>
    </div>
  );
});
