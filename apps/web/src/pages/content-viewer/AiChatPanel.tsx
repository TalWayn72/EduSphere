/** Right column: AI Chavruta chat panel. */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Send } from 'lucide-react';

/** Pre-computed animation delay styles for the typing indicator dots. */
const DOT_DELAY_STYLES: React.CSSProperties[] = [
  { animationDelay: '0ms' },
  { animationDelay: '120ms' },
  { animationDelay: '240ms' },
];

interface ChatMessage {
  id: string;
  role: string;
  content: string;
}

export interface AiChatPanelProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  isStreaming: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  onChatInputChange: (value: string) => void;
  onSendChat: () => void;
}

const QUICK_PROMPTS = ['Debate free will', 'Quiz me', 'Summarize', 'Explain Rambam'];
const CHAT_MODES = ['CHAVRUTA', 'QUIZ', 'EXPLAIN'];

export const AiChatPanel = React.memo(function AiChatPanel({
  chatMessages,
  chatInput,
  isStreaming,
  chatEndRef,
  onChatInputChange,
  onSendChat,
}: AiChatPanelProps) {
  const { t } = useTranslation(['content']);

  return (
    <div className="col-span-12 lg:col-span-3 flex flex-col overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2 border-b flex items-center gap-2 flex-shrink-0">
          <Bot className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">
              {t('content:chavrutaAi')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('content:dialecticalPartner')}
            </p>
          </div>
          <div className="ml-auto flex gap-1">
            {CHAT_MODES.map((mode) => (
              <span
                key={mode}
                className="text-xs px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
              >
                {mode}
              </span>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed
                ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-muted rounded-bl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isStreaming && (
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
          <div ref={chatEndRef} />
        </div>

        {/* Quick prompts */}
        <div className="px-4 py-2 border-t border-b flex gap-2 overflow-x-auto flex-shrink-0">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onChatInputChange(prompt)}
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
              e.key === 'Enter' &&
              !e.shiftKey &&
              !isStreaming &&
              onSendChat()
            }
            placeholder={
              isStreaming
                ? t('content:agentResponding')
                : t('content:askOrDebate')
            }
            disabled={isStreaming}
            className="flex-1 text-sm px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <Button
            size="sm"
            className="h-9 w-9 p-0 flex-shrink-0"
            onClick={onSendChat}
            disabled={isStreaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
});
