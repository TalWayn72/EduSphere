/**
 * ChavrutaPage — dedicated Chavruta (dialectical AI debate) interface.
 *
 * Chavruta is a traditional Jewish learning method where two partners debate
 * a topic. This page pairs the user with an AI opponent that challenges
 * their arguments using Socratic and Talmudic reasoning techniques.
 *
 * EU AI Act Art.50 disclosure: AI involvement is clearly indicated on every
 * AI message bubble and in the page header.
 */
import React from 'react';
import { RotateCcw, Bot, AlertCircle } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DebateInterface } from '@/components/chavruta/DebateInterface';
import { useChavrutaDebate } from '@/hooks/useChavrutaDebate';
import { useParams } from 'react-router-dom';

// ── Loading skeleton ──────────────────────────────────────────────────────────
function DebateSkeleton() {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading debate">
      {[80, 60, 90].map((w) => (
        <div
          key={w}
          className={`h-10 rounded-xl bg-muted animate-pulse`}
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}

// ── Consent gate ──────────────────────────────────────────────────────────────
function ConsentPrompt({ onGrant }: { onGrant: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
      <Bot className="h-10 w-10 text-primary opacity-70" />
      <div className="space-y-1">
        <p className="font-semibold text-sm">AI Processing Consent Required</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Chavruta uses a third-party AI service (OpenAI / Anthropic) to
          generate debate responses. Your arguments will be processed by that
          service. Please consent before continuing. (EU AI Act Art.&nbsp;50 /
          SI-10)
        </p>
      </div>
      <Button size="sm" onClick={onGrant}>
        I Consent — Start Debating
      </Button>
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive text-xs border-b">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function ChavrutaPage() {
  const { topicId } = useParams<{ topicId?: string }>();
  const {
    messages,
    topic,
    isLoading,
    error,
    needsConsent,
    grantConsent,
    submitArgument,
    startNewTopic,
  } = useChavrutaDebate(topicId);

  return (
    <Layout>
      <div className="space-y-4">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              Chavruta Debate
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Dialectical AI learning partner — challenge and be challenged.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* EU AI Act Art.50 disclosure badge */}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border rounded-full px-2.5 py-1">
              <Bot className="h-3 w-3" aria-hidden="true" />
              Generated with AI assistance
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={startNewTopic}
              disabled={isLoading}
              aria-label="Start a new debate topic"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              New Topic
            </Button>
          </div>
        </div>

        {/* Debate card */}
        <Card
          className="flex flex-col overflow-hidden"
          style={{ height: 'calc(100vh - 16rem)' }}
        >
          {error && <ErrorBanner message={error} />}

          {needsConsent ? (
            <ConsentPrompt onGrant={grantConsent} />
          ) : messages.length === 0 && isLoading ? (
            <DebateSkeleton />
          ) : (
            <DebateInterface
              topic={topic}
              messages={messages}
              onSubmit={submitArgument}
              isLoading={isLoading}
            />
          )}
        </Card>
      </div>
    </Layout>
  );
}
