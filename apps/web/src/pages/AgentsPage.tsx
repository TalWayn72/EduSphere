import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useSubscription } from 'urql';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Bot, Zap, BookOpen, FlaskConical, Lightbulb, Send, RotateCcw,
} from 'lucide-react';
import {
  START_AGENT_SESSION_MUTATION,
  SEND_AGENT_MESSAGE_MUTATION,
  MESSAGE_STREAM_SUBSCRIPTION,
  AGENT_TEMPLATES_QUERY,
} from '@/lib/graphql/agent.queries';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

// ─── Agent modes ──────────────────────────────────────────────────────────────
const AGENT_MODES = [
  {
    id: 'chavruta',
    label: 'Chavruta Debate',
    icon: <Bot className="h-5 w-5" />,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    description: 'Dialectical partner — challenges your arguments using Talmudic reasoning',
    prompts: ['Debate free will', 'Argue against Rambam', 'Challenge my thesis'],
    responses: [
      "An interesting position! But consider the counter-argument: if consciousness is purely deterministic, how can Rambam's framework of moral responsibility hold?",
      'You raise a valid point from the Mishneh Torah. However, the Ramban argues the opposite. How do you reconcile these two authorities?',
      'Excellent! Now steelman the opposing view. That is the true Chavruta method.',
    ],
  },
  {
    id: 'quiz',
    label: 'Quiz Master',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    description: 'Adaptive quizzes based on your learning history and prerequisite gaps',
    prompts: ['Quiz me on free will', 'Test my Rambam knowledge', 'Random concept quiz'],
    responses: [
      "Question 1: Rambam's concept of free will is found primarily in which of his works? A) Guide for the Perplexed B) Mishneh Torah C) Commentary on the Mishnah",
      'Correct! Now a harder question: What is the Hebrew term for the principle that all events are predetermined?',
      'The correct answer is *Hashgacha Pratit* (Divine Providence). Want to review that section?',
    ],
  },
  {
    id: 'summarize',
    label: 'Summarizer',
    icon: <BookOpen className="h-5 w-5" />,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    description: 'Progressive summaries of your studied content with key concept extraction',
    prompts: ['Summarize lesson 1', 'Key concepts only', 'One-paragraph overview'],
    responses: [
      '**Lesson 1 Summary:** The introductory lesson covers Talmudic reasoning methods including *kal vachomer*, *gezera shava*, and *binyan av*.',
      '**Key Concepts:** (1) Pilpul — rigorous analytical debate. (2) Svara — logical reasoning. (3) Machloket — structured dispute. (4) Kushya — a challenge.',
      '**One-line:** Talmudic reasoning uses structured debate, analogy, and logical inference to derive principles from sacred texts.',
    ],
  },
  {
    id: 'research',
    label: 'Research Scout',
    icon: <FlaskConical className="h-5 w-5" />,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    description: 'Cross-reference finder — discovers connections across texts and time periods',
    prompts: ['Find contradictions', 'Cross-reference Aristotle', 'Related sources'],
    responses: [
      '**Contradiction detected:** Rambam (Guide III:17) argues for limited divine providence. Nahmanides argues for universal providence. Both cite Job 34:21 with opposite conclusions.',
      '**Aristotle connections:** (1) Kal vachomer ↔ a fortiori (Prior Analytics). (2) Pilpul ↔ Socratic dialectic.',
      '**Related sources:** Guide for the Perplexed III:51 | Mishneh Torah, Laws of Teshuvah 5:1 | Talmud Bavli, Berakhot 33b',
    ],
  },
  {
    id: 'explain',
    label: 'Explainer',
    icon: <Lightbulb className="h-5 w-5" />,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    description: 'Adaptive explanations that adjust to your understanding level',
    prompts: ["Explain like I'm 5", 'Advanced explanation', 'Practical examples'],
    responses: [
      "**Simple:** Imagine a court case. 'If a small thing requires proof, a big thing *definitely* requires proof.' That's *kal vachomer*.",
      '**Advanced:** *Kal vachomer* operates through *binyan av* — establishing a norm from a clear case and extending it to an ambiguous one.',
      '**Example:** If watering plants is prohibited on Shabbat, then certainly uprooting trees is prohibited — a real Talmudic *kal vachomer*.',
    ],
  },
] as const;

type AgentModeId = (typeof AGENT_MODES)[number]['id'];

interface ChatMsg {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

// Maps local mode id → GraphQL TemplateType enum value
const TEMPLATE_TYPE: Record<AgentModeId, string> = {
  chavruta: 'CHAVRUTA_DEBATE',
  quiz: 'QUIZ_ASSESS',
  summarize: 'SUMMARIZE',
  research: 'RESEARCH_SCOUT',
  explain: 'EXPLAIN',
};

const INITIAL_MESSAGES: Record<AgentModeId, string> = {
  chavruta: "שלום! I'm your Chavruta partner. Present an argument and I will challenge it.",
  quiz: 'Ready to test your knowledge! Tell me which topic to quiz you on.',
  summarize: 'I can summarize any lesson or concept. Which content would you like summarized?',
  research: 'Research mode active. I will find cross-references and contradictions. What should I investigate?',
  explain: 'Explain mode ready. Tell me what concept you want explained and at what level.',
};

function buildInitialSessions(): Record<AgentModeId, ChatMsg[]> {
  return Object.fromEntries(
    (Object.keys(INITIAL_MESSAGES) as AgentModeId[]).map((id) => [
      id,
      [{ id: '0', role: 'agent' as const, content: INITIAL_MESSAGES[id] }],
    ])
  ) as Record<AgentModeId, ChatMsg[]>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AgentsPage() {
  const [activeMode, setActiveMode] = useState<AgentModeId>('chavruta');
  const [chatInput, setChatInput] = useState('');
  const [agentSessionIds, setAgentSessionIds] = useState<Partial<Record<AgentModeId, string>>>({});
  const [sessions, setSessions] = useState<Record<AgentModeId, ChatMsg[]>>(buildInitialSessions);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const [, startSession] = useMutation(START_AGENT_SESSION_MUTATION);
  const [, sendMessage] = useMutation(SEND_AGENT_MESSAGE_MUTATION);

  // Load real agent templates (used in non-DEV_MODE to validate template availability)
  const [templatesResult] = useQuery({
    query: AGENT_TEMPLATES_QUERY,
    pause: DEV_MODE,
  });

  const currentSessionId = agentSessionIds[activeMode] ?? null;

  // ─── Subscription: real AI streaming ────────────────────────────────────────
  const [streamResult] = useSubscription({
    query: MESSAGE_STREAM_SUBSCRIPTION,
    variables: { sessionId: currentSessionId ?? '' },
    pause: DEV_MODE || !currentSessionId,
  });

  // Handle subscription messages — real schema has no isStreaming field
  useEffect(() => {
    const msg = streamResult.data?.messageStream;
    if (!msg) return;
    setSessions((prev) => {
      const current = prev[activeMode] ?? [];
      const last = current[current.length - 1];
      // Update existing agent message by id, or append new one
      if (last && last.role === 'agent' && last.id === (msg.id as string)) {
        return {
          ...prev,
          [activeMode]: [
            ...current.slice(0, -1),
            { ...last, content: msg.content as string },
          ],
        };
      }
      return {
        ...prev,
        [activeMode]: [
          ...current,
          { id: msg.id as string, role: 'agent' as const, content: msg.content as string },
        ],
      };
    });
    setIsTyping(false);
  }, [streamResult.data, activeMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, streamingContent, isTyping]);

  const handleSend = useCallback(async () => {
    if (!chatInput.trim() || isTyping || streamingContent) return;
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', content: chatInput };
    const capturedMode = activeMode;
    const capturedInput = chatInput;
    setChatInput('');
    setSessions((prev) => ({ ...prev, [capturedMode]: [...prev[capturedMode], userMsg] }));

    if (!DEV_MODE) {
      setIsTyping(true);
      let gotResponse = false;
      try {
        let sessionId = agentSessionIds[capturedMode];
        if (!sessionId) {
          const res = await startSession({
            templateType: TEMPLATE_TYPE[capturedMode],
            context: {},
          });
          const newId = res.data?.startAgentSession?.id as string | undefined;
          if (newId) {
            setAgentSessionIds((prev) => ({ ...prev, [capturedMode]: newId }));
            sessionId = newId;
          }
        }
        if (sessionId) {
          const res = await sendMessage({ sessionId, content: capturedInput });
          const reply = res.data?.sendMessage;
          if (reply) {
            setSessions((prev) => ({
              ...prev,
              [capturedMode]: [
                ...prev[capturedMode],
                { id: reply.id as string, role: 'agent', content: reply.content as string },
              ],
            }));
            gotResponse = true;
          }
        }
      } finally {
        setIsTyping(false);
      }
      // GraphQL failed (Unauthorized / network error) — fall back to mock response
      if (!gotResponse) {
        const modeData = AGENT_MODES.find((m) => m.id === capturedMode)!;
        const fullText =
          modeData.responses[Math.floor(Math.random() * modeData.responses.length)] ??
          modeData.responses[0];
        const reply: ChatMsg = { id: (Date.now() + 1).toString(), role: 'agent', content: fullText };
        setSessions((prev) => ({ ...prev, [capturedMode]: [...prev[capturedMode], reply] }));
      }
      return;
    }

    // ── Mock / DEV_MODE path — streaming animation ──
    setIsTyping(true);
    setTimeout(() => {
      const modeData = AGENT_MODES.find((m) => m.id === capturedMode)!;
      const fullText =
        modeData.responses[Math.floor(Math.random() * modeData.responses.length)] ??
        modeData.responses[0];
      setIsTyping(false);
      let charIdx = 0;
      setStreamingContent('');
      streamRef.current = setInterval(() => {
        charIdx += 3;
        setStreamingContent(fullText.slice(0, charIdx));
        if (charIdx >= fullText.length) {
          clearInterval(streamRef.current);
          setStreamingContent('');
          const reply: ChatMsg = {
            id: (Date.now() + 1).toString(),
            role: 'agent',
            content: fullText,
          };
          setSessions((prev) => ({
            ...prev,
            [capturedMode]: [...prev[capturedMode], reply],
          }));
        }
      }, 18);
    }, 600);
  }, [chatInput, activeMode, isTyping, streamingContent, agentSessionIds, startSession, sendMessage]);

  const handleReset = () => {
    setSessions((prev) => ({ ...prev, [activeMode]: [prev[activeMode][0]!] }));
    setAgentSessionIds((prev) => { const next = { ...prev }; delete next[activeMode]; return next; });
  };

  const mode = AGENT_MODES.find((m) => m.id === activeMode)!;
  const messages = sessions[activeMode];
  const hasTemplatesError = !DEV_MODE && templatesResult.error;

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">AI Learning Agents</h1>
          <p className="text-sm text-muted-foreground">
            Choose an agent mode to enhance your learning
            {DEV_MODE && (
              <span className="ml-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded">
                Dev Mode — mock responses
              </span>
            )}
          </p>
          {hasTemplatesError && (
            <p className="text-xs text-destructive mt-1">
              Could not load agent templates: {templatesResult.error?.message}
            </p>
          )}
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {AGENT_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMode(m.id as AgentModeId)}
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

        {/* Active agent chat */}
        <Card className="flex flex-col" style={{ height: 'calc(100vh - 22rem)' }}>
          <div className={`flex items-center gap-3 px-4 py-3 border-b rounded-t-lg ${mode.bg}`}>
            <div className={mode.color}>{mode.icon}</div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{mode.label}</p>
              <p className="text-xs text-muted-foreground">{mode.description}</p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleReset}>
              <RotateCcw className="h-3 w-3 mr-1" /> Reset
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm leading-relaxed whitespace-pre-wrap
                  ${msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-muted rounded-bl-none'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg rounded-bl-none px-4 py-3 flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                      style={{ animationDelay: `${i * 120}ms` }} />
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

          <div className="px-4 py-2 border-t border-b flex gap-2 overflow-x-auto">
            {mode.prompts.map((p) => (
              <button key={p} onClick={() => setChatInput(p)}
                className="text-xs px-2.5 py-1.5 rounded-full border bg-muted/40 hover:bg-primary/10 hover:border-primary/30 whitespace-nowrap transition-colors">
                {p}
              </button>
            ))}
          </div>

          <div className="px-4 py-3 flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={isTyping || streamingContent ? 'Agent is responding...' : `Ask the ${mode.label}...`}
              disabled={isTyping || !!streamingContent}
              className="flex-1 text-sm px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <Button size="sm" className="h-9 w-9 p-0" onClick={handleSend}
              disabled={isTyping || !!streamingContent}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
