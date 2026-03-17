/**
 * Utility helpers for module/content-item display.
 */

/** Badge color per content type */
export function typeBadgeVariant(
  type: string
): 'default' | 'secondary' | 'outline' {
  if (['VIDEO', 'AUDIO'].includes(type)) return 'default';
  if (['QUIZ', 'ASSIGNMENT'].includes(type)) return 'secondary';
  return 'outline';
}

export const TYPE_EMOJI: Record<string, string> = {
  VIDEO: '\u{1F3AC}',
  PDF: '\u{1F4C4}',
  MARKDOWN: '\u{1F4DD}',
  QUIZ: '\u2753',
  ASSIGNMENT: '\u270F\uFE0F',
  LINK: '\u{1F517}',
  AUDIO: '\u{1F3A7}',
  RICH_DOCUMENT: '\u{1F4D6}',
  LIVE_SESSION: '\u{1F4E1}',
  SCORM: '\u{1F4E6}',
};
