import { useState, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Zap, BookOpen, FlaskConical, Lightbulb, Send, RotateCcw } from 'lucide-react';

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
      'An interesting position! But consider the counter-argument: if consciousness is purely deterministic, how can Rambam\'s framework of moral responsibility hold? Let me push back on your claim.',
      'You raise a valid point from the Mishneh Torah. However, the Ramban in his commentary on Bereishit argues the opposite. How do you reconcile these two authorities?',
      'Excellent! Now steelman the opposing view. What is the strongest argument *against* your position? That is the true Chavruta method.',
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
      'Question 1: Rambam\'s concept of free will is found primarily in which of his works? A) Guide for the Perplexed B) Mishneh Torah C) Commentary on the Mishnah D) Sefer HaMitzvot',
      'Correct! Now a harder question: What is the Hebrew term for the principle that all events are predetermined? How does this concept relate to the Talmudic notion of divine reward and punishment?',
      'Good effort! The correct answer is *Hashgacha Pratit* (Divine Providence). This connects to your earlier lesson on Metaphysics. Want to review that section?',
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
      '**Lesson 1 Summary:** The introductory lesson covers Talmudic reasoning methods including *kal vachomer* (a fortiori reasoning), *gezera shava* (analogical reasoning), and *binyan av* (general principles). The *chavruta* method of paired study mirrors the dialectical approach of the Talmud itself.',
      '**Key Concepts:** (1) Pilpul — rigorous analytical debate method. (2) Svara — logical reasoning beyond explicit text. (3) Machloket — structured dispute as path to truth. (4) Kushya — a difficulty or challenge to an argument.',
      '**One-line:** Talmudic reasoning uses structured debate, analogy, and logical inference to derive legal and philosophical principles from sacred texts.',
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
      '🔍 **Contradiction detected:** Rambam (Guide III:17) argues for limited divine providence over individuals. Nahmanides (Sha\'ar HaGemul) argues for universal divine providence. Both cite the same verse (Job 34:21) with opposite conclusions.',
      '📚 **Aristotle connections found:** (1) Kal vachomer ↔ a fortiori reasoning (Prior Analytics). (2) Pilpul debate method ↔ Socratic dialectic. (3) Svara logical inference ↔ syllogistic reasoning. (4) Machloket as truth-seeking ↔ Socratic aporia.',
      '🔗 **Related sources:** Guide for the Perplexed III:51 | Mishneh Torah, Laws of Teshuvah 5:1–3 | Talmud Bavli, Berakhot 33b | Sefer HaKuzari, Part II §6',
    ],
  },
  {
    id: 'explain',
    label: 'Explainer',
    icon: <Lightbulb className="h-5 w-5" />,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    description: 'Adaptive explanations that adjust to your understanding level',
    prompts: ['Explain like I\'m 5', 'Advanced explanation', 'Practical examples'],
    responses: [
      '🟢 **Simple:** Imagine a court case. The Talmud asks: "If a small thing requires proof, a big thing *definitely* requires proof." That\'s *kal vachomer* — reasoning from easy to hard.',
      '🔵 **Advanced:** *Kal vachomer* (a fortiori) operates through the principle of *binyan av* — establishing a legal norm from a clear case and extending it to an ambiguous one. It differs from mere analogy (*gezera shava*) in that the extension is logically necessary, not just similar.',
      '💡 **Example:** If watering plants is prohibited on Shabbat, then certainly uprooting trees is prohibited too — the smaller act implies the larger restriction. This is a real Talmudic application of *kal vachomer*.',
    ],
  },
] as const;

type AgentModeId = typeof AGENT_MODES[number]['id'];

interface ChatMsg { id: string; role: 'user' | 'agent'; content: string }

// ─── Component ────────────────────────────────────────────────────────────────
export function AgentsPage() {
  const [activeMode, setActiveMode] = useState<AgentModeId>('chavruta');
  const [chatInput, setChatInput] = useState('');
  const [sessions, setSessions] = useState<Record<AgentModeId, ChatMsg[]>>({
    chavruta: [{ id: '0', role: 'agent', content: 'שלום! I\'m your Chavruta partner. Present an argument and I will challenge it using classical reasoning.' }],
    quiz: [{ id: '0', role: 'agent', content: 'Ready to test your knowledge! Tell me which topic to quiz you on, or just say "random".' }],
    summarize: [{ id: '0', role: 'agent', content: 'I can summarize any lesson or concept. Which content would you like me to summarize?' }],
    research: [{ id: '0', role: 'agent', content: 'Research mode active. I will find cross-references, contradictions, and related sources. What should I investigate?' }],
    explain: [{ id: '0', role: 'agent', content: 'Explain mode ready. Tell me what concept you want explained and at what level (simple / advanced / example).' }],
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const mode = AGENT_MODES.find((m) => m.id === activeMode)!;
  const messages = sessions[activeMode];

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', content: chatInput };
    setChatInput('');
    setSessions((prev) => ({ ...prev, [activeMode]: [...prev[activeMode], userMsg] }));

    setTimeout(() => {
      const modeData = AGENT_MODES.find((m) => m.id === activeMode)!;
      const pick = modeData.responses[Math.floor(Math.random() * modeData.responses.length)] ?? modeData.responses[0];
      const reply: ChatMsg = { id: (Date.now() + 1).toString(), role: 'agent', content: pick };
      setSessions((prev) => ({ ...prev, [activeMode]: [...prev[activeMode], reply] }));
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 700);
  };

  const handleReset = () => {
    setSessions((prev) => ({ ...prev, [activeMode]: [prev[activeMode][0]!] }));
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">AI Learning Agents</h1>
          <p className="text-sm text-muted-foreground">Choose an agent mode to enhance your learning</p>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {AGENT_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMode(m.id as AgentModeId)}
              className={`p-3 rounded-xl border text-left transition-all ${activeMode === m.id
                ? `${m.bg} ring-2 ring-primary shadow-sm`
                : 'border-muted hover:border-primary/40 hover:bg-muted/30'
              }`}
            >
              <div className={`mb-2 ${m.color}`}>{m.icon}</div>
              <p className="text-xs font-semibold leading-tight">{m.label}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-tight line-clamp-2">{m.description}</p>
            </button>
          ))}
        </div>

        {/* Active agent chat */}
        <Card className="flex flex-col" style={{ height: 'calc(100vh - 22rem)' }}>
          {/* Header */}
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

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm leading-relaxed whitespace-pre-wrap
                  ${msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-muted rounded-bl-none'
                  }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Quick prompts */}
          <div className="px-4 py-2 border-t border-b flex gap-2 overflow-x-auto">
            {mode.prompts.map((p) => (
              <button
                key={p}
                onClick={() => setChatInput(p)}
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
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={`Ask the ${mode.label}...`}
              className="flex-1 text-sm px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <Button size="sm" className="h-9 w-9 p-0" onClick={handleSend}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
