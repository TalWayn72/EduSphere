import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { X, Send, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChatMessage } from '@/components/ChatMessage';
import type { AgentType } from '@/types/chat';
import { AGENT_TYPES } from '@/types/chat';
import { useAIChat } from './useAIChat';

interface AIChatPanelProps {
  className?: string;
}

export function AIChatPanel({ className }: AIChatPanelProps) {
  const { t } = useTranslation('agents');
  const {
    isOpen,
    setIsOpen,
    selectedAgent,
    setSelectedAgent,
    messages,
    inputValue,
    setInputValue,
    isStreaming,
    stopGeneration,
    messagesEndRef,
    inputRef,
    handleSendMessage,
    handleKeyPress,
    currentAgent,
  } = useAIChat();

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 end-6 h-14 w-14 rounded-full shadow-lg z-40"
          size="icon"
          aria-label="Open AI chat"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      <div
        aria-label="AI Chat Panel"
        className={cn(
          'fixed top-0 end-0 h-full w-full md:w-[480px] bg-background border-s shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('chatPanel.title')}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8"
            aria-label="Close AI chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* EU AI Act Art. 50 + WCAG disclosure */}
        <div
          role="note"
          aria-label="AI disclosure"
          className="mx-4 mt-3 text-xs text-muted-foreground bg-muted/50 rounded p-2 mb-2"
        >
          You are interacting with an AI assistant. Responses are AI-generated
          and may contain errors.
        </div>

        <AgentSelector
          selectedAgent={selectedAgent}
          onSelect={(v) => setSelectedAgent(v as AgentType)}
          t={t}
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {t('chatPanel.startConversation')}
              </p>
              <p className="text-sm max-w-xs">
                Ask me anything about {currentAgent.name.toLowerCase()} topics!
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  agentName={currentAgent.name}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <ChatInputBar
          inputRef={inputRef}
          inputValue={inputValue}
          setInputValue={setInputValue}
          isStreaming={isStreaming}
          stopGeneration={stopGeneration}
          handleSendMessage={handleSendMessage}
          handleKeyPress={handleKeyPress}
          currentAgentName={currentAgent.name}
          t={t}
        />
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AgentSelector({
  selectedAgent,
  onSelect,
  t,
}: {
  selectedAgent: AgentType;
  onSelect: (v: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="p-4 border-b bg-background">
      <label
        htmlFor="ai-agent-select"
        className="text-sm font-medium mb-2 block"
      >
        {t('selectAgent')}
      </label>
      <Select value={selectedAgent} onValueChange={onSelect}>
        <SelectTrigger
          id="ai-agent-select"
          className="w-full"
          aria-label={t('selectAgent')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(AGENT_TYPES).map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              <div className="flex items-center gap-2">
                <span>{agent.icon}</span>
                <div className="flex flex-col">
                  <span className="font-medium">{agent.name}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {agent.description}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ChatInputBar({
  inputRef,
  inputValue,
  setInputValue,
  isStreaming,
  stopGeneration,
  handleSendMessage,
  handleKeyPress,
  currentAgentName,
  t,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputValue: string;
  setInputValue: (v: string) => void;
  isStreaming: boolean;
  stopGeneration: () => void;
  handleSendMessage: () => Promise<void>;
  handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  currentAgentName: string;
  t: (key: string) => string;
}) {
  return (
    <div className="p-4 border-t bg-background">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Ask ${currentAgentName}...`}
          disabled={isStreaming}
          className="flex-1"
        />
        {isStreaming ? (
          <Button
            variant="outline"
            size="sm"
            onClick={stopGeneration}
            className="shrink-0"
            aria-label="Stop generation"
          >
            &#9632; Stop
          </Button>
        ) : (
          <Button
            onClick={() => void handleSendMessage()}
            disabled={!inputValue.trim()}
            size="icon"
            className="shrink-0"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {t('chatPanel.inputHint')}
      </p>
    </div>
  );
}
