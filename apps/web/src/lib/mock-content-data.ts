/**
 * Mock Content Data
 * Video, transcript, and annotations for Content Viewer demo.
 * Large data arrays are split into dedicated .data.ts files for maintainability.
 */

export interface TranscriptSegment {
  id: string;
  startTime: number; // seconds
  endTime: number;
  text: string;
}

export interface Bookmark {
  id: string;
  timestamp: number; // seconds
  label: string;
  color?: string;
}

export interface Annotation {
  id: string;
  timestamp: number; // seconds
  layer: 'PERSONAL' | 'SHARED' | 'INSTRUCTOR' | 'AI_GENERATED';
  author: string;
  content: string;
  createdAt: Date;
}

export interface VideoContent {
  id: string;
  title: string;
  description: string;
  duration: number; // seconds
  url: string;
  thumbnailUrl?: string;
}

export const mockVideo: VideoContent = {
  id: 'video-1',
  title: 'Introduction to Talmudic Reasoning',
  description:
    'Learn the fundamentals of logical argumentation in Jewish texts',
  duration: 300, // 5 minutes
  url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  thumbnailUrl:
    'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
};

export const mockBookmarks: Bookmark[] = [
  { id: 'b1', timestamp: 15, label: 'Pilpul definition', color: '#3b82f6' },
  {
    id: 'b2',
    timestamp: 30,
    label: 'Kal vachomer explained',
    color: '#10b981',
  },
  { id: 'b3', timestamp: 75, label: 'Binyan av principle', color: '#f59e0b' },
  { id: 'b4', timestamp: 120, label: 'Analyzing sugya', color: '#8b5cf6' },
  { id: 'b5', timestamp: 210, label: 'Machloket value', color: '#ec4899' },
];

// Large data arrays live in dedicated files for readability
export { mockTranscript } from './mock-transcript.data';
export { mockVideoAnnotations as mockAnnotations } from './mock-video-annotations.data';

/** TipTap JSON fallback document shown when gateway is offline (dev mode). */
export const mockDocumentContent = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'נהר שלום — פנינים מאוץ' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          marks: [{ type: 'italic' }],
          text: 'מאת רבי שלום שרעבי (הרש"ש), מקובל ירושלמי, ה\'תס"ח–ה\'תקל"ז',
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'הקדמה' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'ספר זה מבאר את סודות הכוונות בתפילה על פי שיטת האר"י הקדוש. הרש"ש מסביר את מבנה הספירות ואת הכוונות הנדרשות בכל ברכה וברכה של תפילת עמידה.',
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'פרק א — עולם האצילות' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'דע כי עולם האצילות הוא עולם האלוקות עצמה, ואין שם פירוד כלל. הספירות הן כלים אלוקיים שדרכם מתגלה האור האין-סופי לברואים.',
        },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'כתר עליון: ' },
                { type: 'text', text: 'רצון הפשוט, מקור כל האורות' },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'חכמה: ' },
                { type: 'text', text: 'ראשית הגילוי, נקודת האור' },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'בינה: ' },
                { type: 'text', text: 'הרחמים, אם הבנים, מקור הנשמות' },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '"וידעת היום והשבות אל לבבך כי ה\' הוא האלהים" — דברים ד:לט',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          marks: [{ type: 'italic' }],
          text: '(זהו תוכן הדגמה — לצפייה בטקסט המלא הפעל את שרת ה-Content Subgraph)',
        },
      ],
    },
  ],
});
