import type { Message } from '@/types/chat';

/**
 * Mock Chavruta Debate Conversation
 * Demonstrates dialectical reasoning on free will vs determinism
 */
export const mockChatHistory: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: "What's the relationship between free will and divine providence?",
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
  },
  {
    id: 'msg-2',
    role: 'agent',
    content:
      "Before we discuss that, let me ask you a fundamental question: How do you define 'free will'? Is it the complete absence of constraints, or the ability to choose between alternatives even when influenced?",
    timestamp: new Date(Date.now() - 1000 * 60 * 14.5),
  },
  {
    id: 'msg-3',
    role: 'user',
    content: 'The ability to choose between alternatives, I think.',
    timestamp: new Date(Date.now() - 1000 * 60 * 14),
  },
  {
    id: 'msg-4',
    role: 'agent',
    content:
      "Interesting! But consider Rambam's position in *Guide for the Perplexed* (Part III, Chapter 17) - he argues that even with alternatives, our choices are influenced by prior causes: our nature, upbringing, and circumstances.\n\nDoes that contradict your definition? Or can we have 'free will' even within a deterministic framework?",
    timestamp: new Date(Date.now() - 1000 * 60 * 13.5),
  },
  {
    id: 'msg-5',
    role: 'user',
    content: "Hmm, I see the tension. But if everything is determined, how can we be held morally responsible?",
    timestamp: new Date(Date.now() - 1000 * 60 * 13),
  },
  {
    id: 'msg-6',
    role: 'agent',
    content:
      "Excellent question! This is precisely where Rambam distinguishes between *metaphysical determinism* and *practical free will*.\n\nHe argues that while God knows our choices in advance, this knowledge doesn't *cause* them. The Talmud (Berachot 33b) states: **'Everything is in the hands of Heaven except the fear of Heaven.'**\n\nWhat do you think this means? Can divine foreknowledge coexist with human choice?",
    timestamp: new Date(Date.now() - 1000 * 60 * 12.5),
  },
  {
    id: 'msg-7',
    role: 'user',
    content: 'So God knows what we will do, but doesn\'t force us to do it?',
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
  },
  {
    id: 'msg-8',
    role: 'agent',
    content:
      "Let me challenge that: If God's knowledge is *perfect* and *unchanging*, doesn't that mean the future is already fixed?\n\nConsider this thought experiment:\n- God knows you will eat an apple tomorrow at noon\n- Could you choose NOT to eat it?\n- If you could, then God's knowledge would be wrong\n- If you couldn't, then you lack free will\n\nHow do you resolve this paradox?",
    timestamp: new Date(Date.now() - 1000 * 60 * 11.5),
  },
  {
    id: 'msg-9',
    role: 'user',
    content: "That's hard... Maybe God's knowledge exists outside of time?",
    timestamp: new Date(Date.now() - 1000 * 60 * 11),
  },
  {
    id: 'msg-10',
    role: 'agent',
    content:
      "Now you're thinking like Rambam! He argues that God's knowledge is fundamentally different from human knowledge - it's *atemporal*.\n\nFrom God's eternal perspective, past, present, and future are simultaneous. So divine foreknowledge isn't really 'fore'-knowledge at all.\n\nBut here's my counter: If God's knowledge is so different from ours, can we even speak meaningfully about it? Aren't we just using words without real understanding?",
    timestamp: new Date(Date.now() - 1000 * 60 * 10.5),
  },
  {
    id: 'msg-11',
    role: 'user',
    content: 'Maybe we can only understand it through analogy or negative theology?',
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
  },
  {
    id: 'msg-12',
    role: 'agent',
    content:
      "Exactly! You've arrived at Rambam's doctrine of *negative attributes* - we can say what God is NOT, but not what God IS.\n\nThis actually preserves both:\n1. **Divine omniscience** - God knows all\n2. **Human free will** - We genuinely choose\n\nBut notice how this resolution comes at a cost: we must accept the *incomprehensibility* of divine knowledge.\n\nDo you find this intellectually satisfying? Or does it feel like avoiding the problem?",
    timestamp: new Date(Date.now() - 1000 * 60 * 9.5),
  },
  {
    id: 'msg-13',
    role: 'user',
    content: "It's frustrating, but maybe that's the point - some things are beyond human reason?",
    timestamp: new Date(Date.now() - 1000 * 60 * 9),
  },
  {
    id: 'msg-14',
    role: 'agent',
    content:
      "Beautifully said! You've touched on the tension between *reason* and *faith* that runs through all of Jewish philosophy.\n\nRambam believed reason could take us very far, but ultimately we must accept certain mysteries. Yet he insisted we should push reason to its limits before surrendering to mystery.\n\nLet me pose one final question: If we can't fully understand how free will and divine providence coexist, does that mean we should act as if we have free will? Or does the paradox paralyze moral action?",
    timestamp: new Date(Date.now() - 1000 * 60 * 8.5),
  },
  {
    id: 'msg-15',
    role: 'user',
    content: "I think we have to act as if we have free will, even if we can't prove it philosophically.",
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
  },
  {
    id: 'msg-16',
    role: 'agent',
    content:
      "Brilliant conclusion! You've arrived at what we might call *practical rationalism*:\n\n**Even if the metaphysical question remains unresolved, the moral imperative is clear: we must act as responsible agents.**\n\nThis aligns with Rambam's view that philosophy should serve life, not paralyze it. The Talmud says: 'It is not upon you to complete the work, but neither are you free to desist from it.'\n\nWould you like to explore how this connects to **ethics and moral responsibility**? Or should we investigate the concept of **divine providence** more deeply?",
    timestamp: new Date(Date.now() - 1000 * 60 * 7.5),
  },
];
