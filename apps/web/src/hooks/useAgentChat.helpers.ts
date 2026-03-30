/**
 * useAgentChat helpers — message types, constants, and optimistic reducer.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

export const INITIAL_MESSAGE: ChatMessage = {
  id: 'init',
  role: 'agent',
  content: `\u05E9\u05DC\u05D5\u05DD! I'm your Chavruta learning partner. I can help you debate, understand, and explore the concepts in this lesson. Ask me anything!`,
};

export const MOCK_RESPONSES = [
  `That's an interesting point. Let me challenge you: if free will truly exists, how do you explain the deterministic nature of neural processes?`,
  `A strong argument! But consider the opposite view: Rambam himself in the Mishneh Torah writes that man has absolute free choice. How do you reconcile this?`,
  `Excellent! Can you find a source in the Talmud that supports or contradicts this position?`,
  `Let's explore this deeper. What would the implications be if you are correct? How would that affect the concept of reward and punishment?`,
];

/**
 * Reducer for useOptimistic: appends a new message to the displayed list.
 */
export function optimisticReducer(
  state: ChatMessage[],
  newMessage: ChatMessage
): ChatMessage[] {
  return [...state, newMessage];
}

/**
 * Append a blinking cursor to the last agent message while streaming.
 */
export function withStreamingCursor(
  messages: ChatMessage[],
  isStreaming: boolean
): ChatMessage[] {
  if (!isStreaming || messages.length === 0) return messages;
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'agent') return messages;
  return [...messages.slice(0, -1), { ...last, content: last.content + '\u258C' }];
}
