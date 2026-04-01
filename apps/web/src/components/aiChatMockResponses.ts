import type { AgentType } from '@/types/chat';

export function generateMockResponse(
  userInput: string,
  agentType: AgentType
): string {
  const preview = userInput.slice(0, 30);
  const responses: Record<AgentType, string> = {
    chavruta: `That's an interesting point! Consider the **counter-argument** from Rambam's perspective.\n\nHe would say that your assumption about "${preview}..." requires a deeper definition first.\n\nWhat evidence supports your position?`,
    'quiz-master': `Let me test your understanding:\n\n**Question:** Based on "${preview}...", which concept does this most closely relate to?\n\nA) Epistemology\nB) Metaphysics\nC) Ethics\nD) Logic`,
    'research-scout': `Found **3 relevant sources** for "${preview}...":\n\n1. **Guide for the Perplexed** (Part II, Ch. 25)\n2. **Talmud Bavli, Berachot 33b**\n3. **Sefer HaIkkarim**\n\nWould you like me to explain the connections?`,
    summarizer: `Key points from "${preview}...":\n\n**Main Idea:** Core concept\n\n**Supporting Arguments:**\n- Point 1\n- Point 2\n\n**Conclusion:** Summary`,
    explainer: `Let me break down "${preview}..." step by step:\n\n**Step 1:** Basic definition\n**Step 2:** Historical context\n**Step 3:** Logical implications\n\nDoes this help clarify?`,
  };
  return responses[agentType];
}
