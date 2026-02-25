/**
 * RoleplaySimulator — F-007 full-screen immersive role-play UI.
 *
 * Shows AI character messages (left/blue) and learner messages (right/gray).
 * Transitions to evaluation report when session completes.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from 'urql';
import { Button } from '@/components/ui/button';
import { Send, X } from 'lucide-react';
import {
  START_ROLEPLAY_MUTATION,
  SEND_ROLEPLAY_MESSAGE_MUTATION,
  MY_SCENARIO_SESSION_QUERY,
} from '@/lib/graphql/roleplay.queries';
import { RoleplayEvaluationReport } from './RoleplayEvaluationReport';

interface Scenario {
  id: string;
  title: string;
  domain: string;
  difficultyLevel: string;
  sceneDescription: string;
  maxTurns: number;
}

interface ChatMessage {
  id: string;
  role: 'character' | 'learner';
  content: string;
}

interface Props {
  scenario: Scenario;
  onClose: () => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER: 'bg-green-100 text-green-800',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-800',
  ADVANCED: 'bg-red-100 text-red-800',
};

const POLL_INTERVAL_MS = 2500;

export function RoleplaySimulator({ scenario, onClose }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const [, startSession] = useMutation(START_ROLEPLAY_MUTATION);
  const [, sendMessage] = useMutation(SEND_ROLEPLAY_MESSAGE_MUTATION);

  const [sessionResult] = useQuery({
    query: MY_SCENARIO_SESSION_QUERY,
    variables: { sessionId: sessionId ?? '' },
    pause: !sessionId,
    requestPolicy: 'network-only',
  });

  // Start the session on mount
  useEffect(() => {
    let mounted = true;
    const start = async () => {
      const result = await startSession({ scenarioId: scenario.id });
      if (!mounted) return;
      const id = result.data?.startRoleplaySession?.id as string | undefined;
      if (id) {
        setSessionId(id);
        setMessages([{
          id: 'opening',
          role: 'character',
          content: scenario.sceneDescription,
        }]);
      }
    };
    void start();
    return () => { mounted = false; };
  }, [scenario.id, scenario.sceneDescription, startSession]);

  // Poll for completion
  useEffect(() => {
    if (!sessionId) return;
    pollRef.current = setInterval(() => {
      const status = sessionResult.data?.myScenarioSession?.status as string | undefined;
      if (status === 'COMPLETED') {
        clearInterval(pollRef.current);
        setShowEvaluation(true);
      }
    }, POLL_INTERVAL_MS);
    return () => { clearInterval(pollRef.current); };
  }, [sessionId, sessionResult.data]);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending || !sessionId) return;
    const userText = input.trim();
    setInput('');
    setIsSending(true);

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'learner', content: userText },
    ]);

    await sendMessage({ sessionId, message: userText });
    setIsSending(false);
  }, [input, isSending, sessionId, sendMessage]);

  const session = sessionResult.data?.myScenarioSession;
  const turnCount = (session?.turnCount as number | undefined) ?? 0;

  if (showEvaluation && session?.evaluation) {
    return (
      <RoleplayEvaluationReport
        evaluation={session.evaluation}
        scenarioTitle={scenario.title}
        onTryAgain={() => {
          setShowEvaluation(false);
          setMessages([]);
          setSessionId(null);
        }}
        onBack={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-gray-900 border-b border-gray-800">
        <div className="flex-1">
          <h2 className="text-white font-bold text-lg">{scenario.title}</h2>
          <p className="text-gray-400 text-sm">{scenario.sceneDescription}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[scenario.difficultyLevel] ?? 'bg-gray-700 text-gray-200'}`}>
            {scenario.difficultyLevel}
          </span>
          <span className="text-gray-400 text-sm">
            {turnCount} / {scenario.maxTurns} turns
          </span>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Turn progress bar */}
      <div className="h-1 bg-gray-800">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${Math.min((turnCount / scenario.maxTurns) * 100, 100)}%` }}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'learner' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'learner'
                  ? 'bg-gray-600 text-white rounded-br-sm'
                  : 'bg-blue-600 text-white rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-blue-600 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 rounded-full bg-white/60 animate-bounce"
                  style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 bg-gray-900 border-t border-gray-800 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
          placeholder={isSending ? 'Waiting for response...' : 'Type your response...'}
          disabled={isSending || !sessionId}
          className="flex-1 bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <Button
          onClick={() => void handleSend()}
          disabled={isSending || !input.trim() || !sessionId}
          className="h-11 w-11 p-0 bg-blue-600 hover:bg-blue-700 rounded-xl"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
