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

/**
 * Markdown fallback document shown when gateway is offline (dev mode).
 * Content mirrors the DB seed (nahar-shalom-course.ts) — BIO_MD + REHOVOT_MD.
 * RichContentViewer converts markdown → HTML automatically when JSON.parse fails.
 */
export const mockDocumentContent = `# הרש"ש — רבי שלום שרעבי (תפ"א–תקל"ז | 1720–1777)

## מי היה הרש"ש?

**רבי שלום מזרחי שרעבי** הידוע בר"ת **רש"ש**, נולד בשנת תפ"א (1720) בצנעא שבתימן.
הוא נחשב לאבי כל המקובלים הספרדים בדורות האחרונים.

בצעירותו עלה לארץ ישראל, הגיע לירושלים ושימש **שמש** בישיבת בית אל — בהסתרת גדלותו.
רבו **ר' גדליה חייון** גילה את עומק חכמתו מכתבים שמצא, ומינהו לממלא מקומו כראש ישיבה.

## ישיבת בית אל

ישיבת בית אל בעיר העתיקה בירושלים היתה המרכז הרוחני של קבלת האר"י.
הרש"ש שימש בה כראש ישיבה עד פטירתו בי' שבט תקל"ז (1777).

## חיבוריו

| ספר | תוכן |
|-----|------|
| **נהר שלום** | ע' תשובות לחכמי תוניס |
| **רחובות הנהר** | ד' עקרי שיטתו (מובא בהקדמת נהר שלום, ל"ב ע"א) |
| **סידור נהר שלום** | כוונות לכל תפילות השנה |
| **אמת ושלום** | שו"ת נוסף |

## שרשרת הקבלה

**האר"י הקדוש** (ר' יצחק לוריא, 1534–1572)
↓ תלמידו ומעתיקו
**ר' חיים ויטאל** (1543–1620) — כתב עץ חיים, שערי הכוונות ועוד
↓ פירוש ושיטתן
**הרש"ש** — קבע את שיטת הכוונות הסטנדרטית לספרדים
↓
כל ישיבות הקבלה הספרדיות עד ימינו

---

# רחובות הנהר — ד' עקרי השיטה

## מהו "רחובות הנהר"?

"רחובות הנהר" הוא כותרת ההקדמה לנהר שלום (דף ל"ב ע"א, דפוס ירושלים תרכ"ז).
הרב יצחק כדורי זצ"ל אמר: **"עד שלא למדת רחובות הנהר — לא למדת קבלה."**

## עיקר א — הסתמכות על כתבי האר"י בלבד

> "ידוע שאנו סומכים על כתבי רבינו האר"י ז"ל בלבד, כפי שנמסרו על ידי ר' חיים ויטאל."

אין לסמוך על פרשנויות מאוחרות, אלא על הזוהר דרך עיני האר"י בלבד.

## עיקר ב — שיטת ההשוואה

כאשר ישנה סתירה בין מקומות שונים בכתבי האר"י, משוים ומוצאים פירוש המתיישב עם כולם.

## עיקר ג — כתבים מאוחרים גוברים

בין כתבי ר' חיים ויטאל השונים, יש להעדיף את שנכתבו בגיל מבוגר יותר —
שהם ביטוי לרמת הבנה גבוהה יותר.

## עיקר ד — פנימיות וחיצוניות

יש להבחין בין **פנים** (פנימיות) ל**חוץ** (חיצוניות) של כל ענין,
ולכוון תמיד לפנימיות שבפנים.`;
