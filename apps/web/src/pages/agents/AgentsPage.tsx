/**
 * AgentsPage — AI Learning Agents page.
 *
 * Thin orchestrator that composes AgentModeSelector + AgentChatPanel
 * with state from useAgentChat hook.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { DEV_MODE } from '@/lib/auth';
import { AGENT_MODES } from './agent-modes-data';
import type { AgentModeId } from './agent-modes';
import { useAgentChat } from './useAgentChat';
import { AgentModeSelector } from './AgentModeSelector';
import { AgentChatPanel } from './AgentChatPanel';

export function AgentsPage() {
  const { t } = useTranslation('agents');

  const {
    activeMode,
    setActiveMode,
    chatInput,
    setChatInput,
    isTyping,
    streamingContent,
    messages,
    chatEndRef,
    hasTemplatesError,
    handleSend,
    handleReset,
  } = useAgentChat();

  // Merge translated labels/descriptions into mode data — memoized to avoid
  // recreating the array (and breaking React.memo on AgentModeSelector) on
  // every render triggered by chat input changes.
  const translatedModes = useMemo(
    () => AGENT_MODES.map((m) => ({
      ...m,
      label: t(`modes.${m.id}.label`),
      description: t(`modes.${m.id}.description`),
    })),
    [t],
  );

  const translatedMode = useMemo(
    () => translatedModes.find((m) => m.id === activeMode)!,
    [translatedModes, activeMode],
  );

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('subtitle')}
            {DEV_MODE && (
              <span className="ml-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded dark:text-yellow-300 dark:bg-yellow-950 dark:border-yellow-700">
                {t('devMode')}
              </span>
            )}
          </p>
          {hasTemplatesError && (
            <p
              role="alert"
              data-testid="agents-templates-error"
              className="text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded px-2 py-1 mt-1 dark:text-orange-200 dark:bg-orange-950 dark:border-orange-700"
            >
              {t('templatesUnavailable')}
            </p>
          )}
        </div>

        <AgentModeSelector
          modes={translatedModes}
          activeMode={activeMode}
          onSelect={(id: AgentModeId) => setActiveMode(id)}
        />

        <AgentChatPanel
          activeMode={activeMode}
          translatedMode={translatedMode}
          messages={messages}
          chatInput={chatInput}
          isTyping={isTyping}
          streamingContent={streamingContent}
          chatEndRef={chatEndRef}
          onInputChange={setChatInput}
          onSend={handleSend}
          onReset={handleReset}
        />
      </div>
    </Layout>
  );
}
