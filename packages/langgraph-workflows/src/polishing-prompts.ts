/**
 * Polishing Prompts — Hebrew-specific prompt templates for the
 * Smart Transcript Polishing workflow.
 *
 * Every function is a pure builder: it receives structured data and returns a
 * ready-to-send prompt string.  No LLM calls live here — prompts are consumed
 * by transcript-polishing-workflow.ts.
 */

import type { JargonEntry } from './transcript-polishing-types';

// ---------------------------------------------------------------------------
// Voice Extraction
// ---------------------------------------------------------------------------

/**
 * Analyses the first transcript chunk to extract the speaker's voice profile.
 *
 * Output contract (LLM must return valid JSON):
 * {
 *   avgSentenceLength: "short" | "medium" | "long",
 *   formality: "formal" | "semi-formal" | "conversational",
 *   transitionPhrases: string[],   // up to 10 typical Hebrew transitions
 *   rhythmMarkers: string[]        // teaching rhythm markers used by speaker
 * }
 */
export function buildVoiceExtractionPrompt(chunkText: string): string {
  return `אתה מנתח סגנון כתיבה וניסוח בעברית לשיעורי תורה.
משימתך: לחלץ פרופיל "קול" של המרצה מהקטע הבא.

נתח את הפרמטרים הבאים:
1. אורך משפט ממוצע (short / medium / long — מבחינת מספר מילים)
2. רמת פורמליות (formal / semi-formal / conversational)
3. מילות/ביטויי מעבר אופייניים (עד 10) — כגון "נמצא", "כלומר", "ולכן", "הבה נבין"
4. סמני קצב הוראה — ניסוחים חוזרים המאפיינים את סגנון הלימוד

החזר אובייקט JSON בלבד (ללא הסברים נוספים):
{
  "avgSentenceLength": "short" | "medium" | "long",
  "formality": "formal" | "semi-formal" | "conversational",
  "transitionPhrases": ["...", "..."],
  "rhythmMarkers": ["...", "..."]
}

קטע הטקסט לניתוח:
---
${chunkText}
---`;
}

// ---------------------------------------------------------------------------
// Core Polishing
// ---------------------------------------------------------------------------

export interface PolishingPromptParams {
  chunkText: string;
  voiceProfile: string;
  jargonGlossary: JargonEntry[];
  overlapContext: string;
  chunkIndex: number;
  totalChunks: number;
}

/**
 * The core polishing prompt. Instructs the LLM to clean and rewrite a single
 * chunk following all six editorial rules for Torah/Kabbalah lesson transcripts.
 *
 * Output contract (LLM must return valid JSON):
 * {
 *   polishedText: string,
 *   changes: Array<{
 *     type: ChangeType (string),
 *     original: string,
 *     replacement: string | null,
 *     reason: string
 *   }>
 * }
 */
export function buildPolishingPrompt(params: PolishingPromptParams): string {
  const {
    chunkText,
    voiceProfile,
    jargonGlossary,
    overlapContext,
    chunkIndex,
    totalChunks,
  } = params;

  const glossaryLines =
    jargonGlossary.length > 0
      ? jargonGlossary
          .map(
            (g) =>
              `  • "${g.canonical}" — צורות חלופיות: ${g.altForms.map((a) => `"${a}"`).join(', ')}`
          )
          .join('\n')
      : '  (אין מונחים מיוחדים)';

  const overlapSection =
    overlapContext.trim().length > 0
      ? `\n== הקשר חפיפה מהקטע הקודם (לא לעבד — לשמור על רצף בלבד) ==\n${overlapContext}\n`
      : '';

  return `אתה עורך תמלול מקצועי לשיעורי תורה וקבלה בעברית.
קטע ${chunkIndex + 1} מתוך ${totalChunks}.
${overlapSection}
== פרופיל קול המרצה ==
${voiceProfile}

== מילון מונחים ==
${glossaryLines}

== כללי עריכה מחייבים ==

כלל 1 — שלמות (COMPLETENESS):
עבד כל משפט ומשפט. אין לדלג, לסכם, להשמיט או לקצר. כל תוכן בקלט חייב להופיע בפלט.

כלל 2 — סגנון (STYLE):
שמור על הטון, קצב ההוראה והמעברים האופייניים של המרצה בהתאם לפרופיל הקול.

כלל 3 — ניקוי (CLEANUP):
הסר:
- מילות מילוי: אהה, אממ, אה, ממ, אז אז, כן כן
- גמגום: חזרות על אותה מילה/הברה ברצף
- פניות לקהל: "הבנתם?", "טוב?", "סגור?", "יאללה", "נו", "חברים"
- הוראות טכניות: "נעשה ציור", "תמחוק", "תכתוב", "תפתח ב..."

כלל 4 — דיבור→כתיבה (SPEECH→WRITING):
- ציוויים→תיאור: "תביאו סידור" → "נראה בסידור"
- שאלות רטוריות→תשובה ישירה: "מה זה אומר?" → הפסוק/ביטוי אומר...
- גוף ראשון יחיד→רבים: "כשאמרתי" → "כשאמרנו", "ראיתי" → "ראינו"

כלל 5 — ציטוטים (CITATIONS):
בודד ציטוטים ממקורות (פסוקים, משנה, גמרא, זוהר וכד') בפורמט:
- שורה ריקה לפני ואחרי
- הזחה (indent) עם רווח של 4 תווים
- ללא גרשיים

כלל 6 — מינוח (TERMINOLOGY):
השתמש אך ורק בצורה הכתיב הקנונית ממילון המונחים:
האר"י | הרש"ש | מהרח"ו | ישסו"ת | אריך | עתיק | זעיר | נוקבא

== קטע לעריכה ==
${chunkText}

== פורמט תשובה (JSON בלבד) ==
{
  "polishedText": "...",
  "changes": [
    {
      "type": "FILLER_REMOVED" | "STUTTER_REMOVED" | "AUDIENCE_ADDRESS_REMOVED" | "TECHNICAL_INSTRUCTION_REMOVED" | "IMPERATIVE_TO_DESCRIPTION" | "RHETORICAL_Q_ANSWERED" | "PRONOUN_PLURALIZED" | "CITATION_FORMATTED" | "TERMINOLOGY_NORMALIZED",
      "original": "...",
      "replacement": "..." | null,
      "reason": "..."
    }
  ]
}`;
}

// ---------------------------------------------------------------------------
// Stitching
// ---------------------------------------------------------------------------

/**
 * Smooths the transition between the end of one polished chunk and the start
 * of the next, removing abrupt cut-offs caused by the chunking boundary.
 *
 * Output contract: { stitchedTransition: string }
 */
export function buildStitchingPrompt(
  previousChunkEnd: string,
  nextChunkStart: string
): string {
  return `אתה עורך עברית מקצועי המתמחה בשיעורי תורה.
משימתך: ליצור מעבר חלק בין שני קטעים עבורם הגבול נחתך בין כרטיסיות עיבוד.

== סוף הקטע הקודם ==
${previousChunkEnd}

== תחילת הקטע הבא ==
${nextChunkStart}

הנחיות:
- אם הטקסט כבר זורם בצורה טבעית — החזר אותם ללא שינוי
- אם יש חיתוך אמצע-משפט — השלם את המשפט החסר
- אל תוסיף תוכן חדש שאינו נובע מהמקור
- שמור על אורך דומה לקטעים המקוריים

החזר JSON:
{ "stitchedTransition": "..." }`;
}

// ---------------------------------------------------------------------------
// Coverage Repair
// ---------------------------------------------------------------------------

/**
 * Re-polishes segments that were accidentally dropped or had low coverage
 * after the initial polishing pass.
 *
 * Output contract:
 * {
 *   repairedText: string,
 *   changes: ChangeRecord[]
 * }
 */
export function buildCoverageRepairPrompt(
  missedSegments: string[],
  surroundingContext: string,
  voiceProfile: string
): string {
  const segmentsList = missedSegments
    .map((s, i) => `[${i + 1}] ${s}`)
    .join('\n\n');

  return `אתה עורך תמלול מקצועי לשיעורי תורה וקבלה בעברית.
נמצאו קטעים שלא עובדו כראוי בסבב הראשון ויש לתקנם כעת.

== פרופיל קול המרצה ==
${voiceProfile}

== הקשר סביב הקטעים החסרים ==
${surroundingContext}

== קטעים לתיקון ==
${segmentsList}

הנחיות:
- עבד כל קטע בנפרד לפי כללי העריכה המלאים (ניקוי, דיבור→כתיבה, ציטוטים, מינוח)
- שמור על קשר לוגי עם ההקשר הסובב
- אל תשנה תוכן — רק עריכה סגנונית

החזר JSON:
{
  "repairedText": "...",
  "changes": [
    { "type": "...", "original": "...", "replacement": "...", "reason": "..." }
  ]
}`;
}
