/**
 * AiTab — AI Chavruta chat panel for UnifiedLearningPage.
 * Extracted from ContentViewer right-side panel.
 */
import { useTranslation } from 'react-i18next';
import { Bot, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UseAgentChatReturn } from '@/hooks/useAgentChat';

interface Props {
  chat: UseAgentChatReturn;
}

const QUICK_PROMPTS = [
  'Debate free will',
  'Quiz me',
  'Summarize',
  'Explain Rambam',
];

export function AiTab({ chat }: Props) {
  const { t } = useTranslation('content');
  const {
    messages,
    chatInput,
    setChatInput,
    sendMessage,
    chatEndRef,
    isStreaming,
  } = chat;

  const handleSend = () => {
    void sendMessage();
  };

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
          {['CHAVRUTA', 'QUIZ', 'EXPLAIN'].map((mode) => (
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
              {msg.content}
            </div>
          </div>
        ))}
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
        {QUICK_PROMPTS.map((prompt) => (
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
          placeholder={isStreaming ? t('agentResponding') : t('askOrDebate')}
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
