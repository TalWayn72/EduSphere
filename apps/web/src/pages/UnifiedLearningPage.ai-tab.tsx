/**
 * AiTab — AI chat panel with selectable modes (CHAVRUTA / QUIZ / EXPLAIN).
 * Extracted from ContentViewer right-side panel.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Bot, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequirementLink } from '@/components/RequirementLink';
import type { UseAgentChatReturn } from '@/hooks/useAgentChat';
import type { ChatMode } from '@/hooks/useAgentChat';
import { ProgressStatus } from '@/components/ProgressStatus';
import { AI_CHAT_MESSAGES } from '@/lib/progress-messages';

interface Props {
  chat: UseAgentChatReturn;
}

const MODES: ChatMode[] = ['CHAVRUTA', 'QUIZ', 'EXPLAIN'];

const QUICK_PROMPTS_BY_MODE: Record<ChatMode, string[]> = {
  CHAVRUTA: [
    'Debate free will',
    'Challenge this idea',
    'Present a counter-argument',
    'Prove from sources',
  ],
  QUIZ: ['Start quiz', 'Next question', 'Give me a hint', 'Explain the answer'],
  EXPLAIN: [
    'Explain simply',
    'Give an example',
    'Why is this important?',
    'Connect to real life',
  ],
};

const PLACEHOLDER_BY_MODE: Record<ChatMode, string> = {
  CHAVRUTA: 'שאל, הצע, חלוק...',
  QUIZ: 'ענה על השאלה...',
  EXPLAIN: 'מה תרצה להבין?',
};

export function AiTab({ chat }: Props) {
  const { t } = useTranslation('content');
  const location = useLocation();
  const [activeMode, setActiveMode] = useState<ChatMode>(
    chat.mode ?? 'CHAVRUTA'
  );

  const {
    messages,
    chatInput,
    setChatInput,
    sendMessage,
    chatEndRef,
    isStreaming,
    isSending,
    setMode,
  } = chat;

  const handleModeClick = (m: ChatMode) => {
    setActiveMode(m);
    setMode(m);
  };

  const handleSend = () => {
    void sendMessage();
  };

  const quickPrompts = QUICK_PROMPTS_BY_MODE[activeMode];
  const placeholder = isStreaming
    ? t('agentResponding')
    : PLACEHOLDER_BY_MODE[activeMode];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b flex items-center gap-2 flex-shrink-0">
        <Bot className="h-4 w-4 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">{t('chavrutaAi')}</p>
          <p className="text-xs text-muted-foreground truncate">
            {t('dialecticalPartner')}
          </p>
        </div>
        <div className="ml-auto flex gap-1 shrink-0">
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => handleModeClick(m)}
              className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                activeMode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary'
              }`}
              data-mode={m}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] px-3 py-2 rounded-lg text-xs leading-relaxed
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
        {isSending && !isStreaming && (
          <div className="flex justify-start px-1">
            <ProgressStatus
              messages={[...AI_CHAT_MESSAGES]}
              active={isSending}
              variant="minimal"
            />
          </div>
        )}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg rounded-bl-none px-3 py-2 flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-3 py-1.5 border-t border-b flex gap-1.5 overflow-x-auto flex-shrink-0">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => setChatInput(prompt)}
            className="text-xs px-2 py-0.5 rounded-full border bg-muted/40 hover:bg-primary/10 hover:border-primary/30 whitespace-nowrap transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 py-2 flex gap-2 flex-shrink-0">
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) =>
            e.key === 'Enter' && !e.shiftKey && !isStreaming && handleSend()
          }
          placeholder={placeholder}
          disabled={isStreaming}
          className="flex-1 text-xs px-2.5 py-1.5 border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
        />
        <Button
          size="sm"
          className="h-8 w-8 p-0 flex-shrink-0"
          onClick={handleSend}
          disabled={isStreaming}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
