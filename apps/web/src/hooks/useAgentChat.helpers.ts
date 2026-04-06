/**
 * useAgentChat helpers — message types, constants, and optimistic reducer.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

export type ChatMode = 'CHAVRUTA' | 'QUIZ' | 'EXPLAIN';

export const INITIAL_MESSAGES: Record<ChatMode, ChatMessage> = {
  CHAVRUTA: {
    id: 'init',
    role: 'agent',
    content:
      'שלום! אני שותף הלמידה שלך בחברותא. בוא נחשוב יחד ונחקור את הרעיונות בשיעור הזה. במה תרצה להתחיל?',
  },
  QUIZ: {
    id: 'init',
    role: 'agent',
    content:
      'בוא נבחן את הידע שלך! אני מכין שאלות מותאמות לשיעור. כשתהיה מוכן, אמור לי ואני אתחיל את הבוחן.',
  },
  EXPLAIN: {
    id: 'init',
    role: 'agent',
    content:
      'שלום! אני כאן להסביר כל מושג בצורה ברורה ופשוטה. במה אוכל לעזור לך?',
  },
};

// Backward-compatible alias
export const INITIAL_MESSAGE: ChatMessage = INITIAL_MESSAGES.CHAVRUTA;

export const MOCK_RESPONSES_BY_MODE: Record<ChatMode, string[]> = {
  CHAVRUTA: [
    `That's an interesting point. Let me challenge you: if free will truly exists, how do you explain the deterministic nature of neural processes?`,
    `A strong argument! But consider the opposite view: Rambam himself in the Mishneh Torah writes that man has absolute free choice. How do you reconcile this?`,
    `Excellent! Can you find a source in the Talmud that supports or contradicts this position?`,
    `Let's explore this deeper. What would the implications be if you are correct? How would that affect the concept of reward and punishment?`,
  ],
  QUIZ: [
    `שאלה 1: מה הוא עיקרון "קל וחומר" בלוגיקה התלמודית? א) היקש מהקל לחמור  ב) איסור על מזון  ג) תפילת בוקר  ד) מסכת בתלמוד`,
    `תשובה נכונה! עכשיו שאלה קשה יותר: באיזה מסכת מופיעה הדוגמה הראשונה לקל וחומר בתורה?`,
    `טעות — נסה שוב. רמז: חשוב על הפסוק "ואם כסף תלוה את עמי"...`,
    `מצוין! ציון: 3/4. רוצה להמשיך לשאלה הבאה?`,
  ],
  EXPLAIN: [
    `בוא נפרק את זה לשלבים: ראשית, המושג הזה מתייחס ל... כדי להבין טוב יותר, תחשוב על דוגמה מהחיים היומיומיים שלך.`,
    `אנלוגיה שיעזור לך: זה כמו... האם ההסבר הזה עוזר?`,
    `בדיוק! כדי לסכם: המושג הזה חשוב כי הוא מחבר בין... ו... רוצה שאסביר גם את הצד השני?`,
    `שאלה מצוינת! הסיבה שזה חשוב היא... האם רוצה דוגמאות נוספות?`,
  ],
};

// Backward-compatible alias
export const MOCK_RESPONSES: string[] = MOCK_RESPONSES_BY_MODE.CHAVRUTA;

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
  return [
    ...messages.slice(0, -1),
    { ...last, content: last.content + '\u258C' },
  ];
}
