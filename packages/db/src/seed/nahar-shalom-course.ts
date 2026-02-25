/**
 * Seed: נהר שלום — A full example course on Rabbi Shalom Sharabi's (Rashash) magnum opus
 *
 * Source texts: HebrewBooks.org (public-domain scans, free access)
 *   - Siddur Nahar Shalom Part 1: https://hebrewbooks.org/21991
 *   - Siddur Nahar Shalom Part 4: https://hebrewbooks.org/21955
 *
 * Shiurim references:
 *   - kavvanah.blog academic analysis (Prof. Alan Brill)
 *   - Kesertorah.org Kabbalah shiurim catalog
 */

import { createDatabaseConnection, schema } from '../index.js';
import { executeCypher } from '../graph/client.js';

const DEMO_TENANT = '00000000-0000-0000-0000-000000000000';
const GRAPH_NAME = 'edusphere_graph';

// Stable deterministic UUIDs — allows idempotent re-runs via onConflictDoNothing
const IDS = {
  instructor: 'cc000000-0000-0000-0000-000000000001',
  course:     'cc000000-0000-0000-0000-000000000002',
  m1: 'cc100000-0000-0000-0000-000000000001',
  m2: 'cc100000-0000-0000-0000-000000000002',
  m3: 'cc100000-0000-0000-0000-000000000003',
  m4: 'cc100000-0000-0000-0000-000000000004',
  m5: 'cc100000-0000-0000-0000-000000000005',
  m6: 'cc100000-0000-0000-0000-000000000006',
  m7: 'cc100000-0000-0000-0000-000000000007',
  m8: 'cc100000-0000-0000-0000-000000000008',
} as const;

// ---------------------------------------------------------------------------
// Hebrew markdown content for each lesson
// ---------------------------------------------------------------------------

const BIO_MD = `# הרש"ש — רבי שלום שרעבי (תפ"א–תקל"ז | 1720–1777)

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
כל ישיבות הקבלה הספרדיות עד ימינו`;

const REHOVOT_MD = `# רחובות הנהר — ד' עקרי השיטה

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

const TZIMTZUM_MD = `# הצמצום — יסוד הבריאה לפי קבלת האר"י

## מהו הצמצום?

לפני הבריאה, **אור אין סוף** מילא את כל המציאות ללא מגבלה.
כדי לאפשר בריאת עולמות מוגבלים, "כביכול" צמצם הבורא את אורו ממרכז נקודה.

## שלשת השלבים שלאחר הצמצום

1. **החלל** — המקום הפנוי שנוצר לאחר הצמצום
2. **הרשימו** — רושם עדין של האור שנשאר בחלל
3. **הקו** — קו אור דק שנכנס לחלל מהאין סוף

## הספירות בארבעה עולמות

| עולם | תוכן |
|------|------|
| **אצילות** | עולם ה"אלוהות" — ספירות מחוברות לאור אין סוף |
| **בריאה** | עולם הבינה — נשמות הצדיקים |
| **יצירה** | עולם המלאכים |
| **עשיה** | עולם הגשמי |

## משמעות הצמצום לכוונות התפילה

לפי הרש"ש, כל תפילה "מתקנת" את זרימת האור בין העולמות.
הצמצום הוא המפתח להבנת מדוע יש **שלשים ושניים שמות** בפרשת בראשית — כמניין "לב".`;

const SEFIROT_MD = `# הספירות העשר ופרצופיהן

## הספירות העשר

| # | שם | מידה | כנגד |
|---|----|----|------|
| 1 | **כתר** | רצון עליון | מוח |
| 2 | **חכמה** | חכמה — נקודת הבזק | מח ימין |
| 3 | **בינה** | הבנה ופירוט | מח שמאל |
| 4 | **חסד** | אהבה | זרוע ימין |
| 5 | **גבורה** | דין | זרוע שמאל |
| 6 | **תפארת** | רחמים | לב |
| 7 | **נצח** | ניצחון | ירך ימין |
| 8 | **הוד** | הוד | ירך שמאל |
| 9 | **יסוד** | יסוד | ברית |
| 10 | **מלכות** | מלכות — כנסת ישראל | פה |

## חמישה הפרצופים

הפרצופים הם מבנים מורכבים של הספירות:

| פרצוף | ספירה |
|--------|-------|
| **עתיק יומין** | כתר עלמה |
| **אריך אנפין** | כתר גילוי |
| **אבא** | חכמה |
| **אמא** | בינה |
| **זעיר אנפין** | חג"ת נה"י |
| **נוקבא** | מלכות |

## כלל הרש"ש: כולל ופרט

> "כל ספירה כלולה מכל הספירות, ויש בה פרט ספירתה."

כלומר: כל ספירה מכילה בקרבה את כל עשר הספירות.`;

const Q1_20_MD = `# שאלות א–כ מספר נהר שלום

*מקור הטקסט: HebrewBooks.org — [דפוס ירושלים תרכ"ז](https://hebrewbooks.org/21991)*

## שאלה א — כוונת ברכות השחר

**השאלה:** האם בברכות השחר יש לכוון לספירות, או לכוון לאמירת השבחים בלבד?

**תשובת הרש"ש:**
יש לכוון בכל ברכה לספירה המיוחדת לה:
- "על נטילת ידים" → **יסוד** (טהרה)
- "אשר יצר" → **מלכות** (גוף גשמי)
- "אלהי נשמה" → **בינה** (נשמה)
- "המעביר חבלי שינה" → **חסד**

## שאלה ה — כוונת שמע ישראל

**השאלה:** מה כוונת "שמע ישראל ה' אלהינו ה' אחד"?

**תשובת הרש"ש:**
| מילה | כוונה |
|------|-------|
| שמע | גילוי **אמא** (בינה) |
| ישראל | **זעיר אנפין** |
| ה' אלהינו | יחוד **חסד** ו**דין** |
| ה' אחד | יחוד **ז"א** ו**נוקבא** |

## שאלה י — כוונת תפילת העמידה

**השאלה:** מה משמעות שמונה עשרה ברכות לפי קבלת האר"י?

**תשובת הרש"ש:**
- **ג' ראשונות** — אמא מעלה את ז"א ומלבישתו
- **ג' אמצעיות** — בקשת תיקון המידות
- **ג' אחרונות** — ירידת האור בחזרה לעולמות

## עיון נוסף

לעיון ישיר בנוסח השאלות א–כ:
→ [HebrewBooks — נהר שלום, דף א–כ](https://hebrewbooks.org/21991)`;

const Q21_45_MD = `# שאלות כא–מה מספר נהר שלום

*מקור הטקסט: HebrewBooks.org — [דפוס ירושלים תרכ"ז](https://hebrewbooks.org/21991)*

## שאלה כה — עניין כוונת אמן

**השאלה:** מה כוונת אמן — האם הוא כוונה לספירה, לשם קדוש, או להסכמה?

**תשובת הרש"ש:**
"אמן" בגימטריה = **91** = שם הוי"ה (26) + שם אדנ"י (65).
הכוונה בו היא ליחוד שני שמות אלו — יחוד **ז"א** ו**נוקבא**.

## שאלה ל — עניין כוונת מגן אברהם

**השאלה:** מהי כוונת ברכת "מגן אברהם" שבתפילת שחרית?

**תשובת הרש"ש:**
"מגן אברהם" = **חסד** המגן על ז"א.
אברהם = ספירת **חסד**.
יש לכוון לחסד עליון שמבית אבא, המאיר לז"א.

## שאלה לה — עניין כוונת קדושה

**השאלה:** כיצד יש לכוון ב"קדוש קדוש קדוש" — שלש פעמים שם "קדוש"?

**תשובת הרש"ש:**
- "קדוש" ראשון → **אצילות**
- "קדוש" שני → **בריאה**
- "קדוש" שלישי → **יצירה**

כך מתפשטת קדושתו יתברך בשלשת העולמות.

## עיון נוסף
→ [HebrewBooks — נהר שלום, דף כא–מה](https://hebrewbooks.org/21991)`;

const Q46_70_MD = `# שאלות מו–ע מספר נהר שלום

*מקור הטקסט: HebrewBooks.org — [דפוס ירושלים תרכ"ז](https://hebrewbooks.org/21991)*

## שאלה נ — עניין כוונת הלל

**השאלה:** מהי כוונת קריאת ההלל בראש חודש ובמועדות?

**תשובת הרש"ש:**
ההלל מסדר את **עולם הבריאה** כדי לקבל את האור העליון מ**אצילות**.
כל מזמור מכוון לספירה שונה:
- "הללו עבדי ה'" → **מלכות**
- "שמש וירח הללוהו" → **נצח** ו**הוד**
- "הללוהו בתקע שופר" → **כתר** עליון

## שאלה סה — עניין כוונת מזוזה

**השאלה:** מהו סדר כוונת הנחת/קריאת המזוזה?

**תשובת הרש"ש:**
- "שמע" שבמזוזה → **בינה**
- שם שד"י (שומר דלתות ישראל) → **יסוד**
- הנחה על פתח הבית → **מלכות** — שכינה שמירה על הבית

## שאלה ע — שאלת הסיכום: מה מיוחד בשיטת הרש"ש?

**תשובת הרש"ש (תשובה אחרונה):**
> "עיקר שיטתנו — שלא לזוז מכתבי הרב ז"ל אפילו כחוט השערה.
> וכל מה שנתחדש אחריו — אינו מוסיף אלא גורע."

## עיון נוסף
→ [HebrewBooks — נהר שלום, דף מו–ע](https://hebrewbooks.org/21991)`;

const SHACHARIT_MD = `# כוונות שחרית לפי סדר הרש"ש

*מקור: [סידור נהר שלום — HebrewBooks.org](https://hebrewbooks.org/21991)*

## מבוא

**סידור נהר שלום** הוא הסידור הסטנדרטי של ישיבת בית אל ושל מקובלי הספרד.
הוא מכיל כוונות לכל תפילות השנה לפי שיטת הרש"ש, המבוססת על כתבי האר"י.

## א. עטיפת טלית

כוונת עטיפת הטלית — להמשיך **אור מקיף** (אור עליון שאינו מתלבש) מ**כתר**
לכל פרצוף ופרצוף.
"ויכסהו" = כיסוי ה**חיצוניות** כדי שהפנימיות תאיר.

## ב. הנחת תפילין

| תפילין | ספירה |
|--------|-------|
| **של יד** (על הלב) | **מלכות** |
| **של ראש** — ד' בתים | **חכמה, בינה, תפארת, מלכות** |
| **ד' פרשיות** | ד' אותיות של שם הוי"ה |

## ג. ברכות השחר

כל ברכה ממשיכה אור מספירה מסוימת — ראה גם שאלה א' בנהר שלום.

## ד. פסוקי דזמרה

פסוקי דזמרה מסדרים את **עולם הבריאה** לפני קריאת שמע.
כל מזמור = ספירה שונה בעולם הבריאה:
- **ברוך שאמר** → כתר הבריאה
- **אשרי** → חכמה הבריאה
- **הללויה** → מלכות הבריאה

## ה. קריאת שמע

הכוונה העיקרית: **יחוד עליון** של ז"א ונוקבא.
בפסוק "שמע ישראל" יש לכוון שהספירות מתאחדות:
- פרוש ידיים = פרישת ענפי חסד לכל העולמות

## ו. תפילת עמידה

- **ג' ברכות ראשונות** — אמא מעלה את ז"א ומלבישה אותו
- **ברכות האמצעיות** — בקשת תיקון המידות (חסד, גבורה, תפארת)
- **ג' ברכות אחרונות** — ירידת האור בחזרה לעולמות

## ז. לאחר התפילה — שיעור בספר

מנהג ישיבת בית אל: לאחר תפילת שחרית — שיעור ב**אץ חיים** ובנהר שלום.`;

const SHABBAT_MD = `# כוונות שבת ומועד לפי הרש"ש

*מקור: [סידור נהר שלום חלק ד' — HebrewBooks.org](https://hebrewbooks.org/21955)*

## עניין השבת בקבלה

השבת היא **נשמה יתרה** — תוספת אור אלוקי שאינו נוכח בחול.
לפי הרש"ש, בשבת מאירים אורות גבוהים יותר:
- בחול: **עולם הבריאה** ומטה
- בשבת: **עולם האצילות** עצמו

## ליל שבת — קבלת שבת

### לכה דודי — שלב שלב

| בית | ספירה |
|-----|-------|
| "שמור וזכור בדיבור אחד" | יחוד **חסד** ו**דין** |
| "מקדש מלך עיר מלוכה" | **תפארת** |
| "בואי בשלום" | **יסוד** |
| "בואי כלה" | קבלת **נוקבא** |

### קידוש לילה

בקידוש ליל שבת יש לכוון ל**מלכות** המקבלת אורות השבת מ**ז"א**.
"ויכולו" — ז"א ונוקבא מסיימים יחד את ששת ימי הבריאה.

## שחרית שבת

תפילת שחרית שבת מכוונת כנגד **עולם האצילות** ממש — לכן מוסיפים פיוטים.

### ישתבח — שמונה עשרה שבחים

שמונה עשרה השבחים בישתבח של שבת כנגד ח"י עולמות המקיפים.

## מוסף שבת

מוסף שבת — כנגד **כתר** עליון של אבא ואמא.
זהו שיא אור השבת: "אתה אחד ושמך אחד ומי כעמך ישראל."

## ראש השנה ויום כיפור

| תפילה | כוונה |
|-------|-------|
| **שופר** | עורר אות **כתר** (עתיק יומין) |
| **נעילה** | סגירת שערי הדין ופתיחת שערי הרחמים |
| **כל נדרי** | ביטול כוחות החיצוניות |

## הבדלה

הבדלה — פרידה מנשמה יתרה:
- **יין** → **יסוד** (עמוד הברכה)
- **בשמים** → **נצח** ו**הוד** (ריח השארית)
- **נר** → **גבורה** (אש הדין שהתמתק)`;

// ---------------------------------------------------------------------------
// Shiur links (academic / publicly available)
// ---------------------------------------------------------------------------
const SHIURIM_LINK_MD = `# משאבים חיצוניים: שיעורים ומאמרים על נהר שלום

## ספר הטקסט — HebrewBooks.org (ציבורי, חינמי)

- [סידור נהר שלום חלק א׳ — עמ' 1 (Shacharit)](https://hebrewbooks.org/21991)
- [סידור נהר שלום חלק ד׳ (Shabbat & Festivals)](https://hebrewbooks.org/21955)
- [ארכיון Internet Archive — כתבי הרש"ש](https://archive.org/details/ldpd_16039256_000)

## מאמרים אקדמיים

- [kavvanah.blog — "Lurianic Kavvanot: from Vital to Rashash to Zhidichov" (2025)](https://kavvanah.blog/2025/08/25/lurianic-kavvanot-from-vital-to-rashash-to-zhidichov-jeremy-tibbetts/)
- [kavvanah.blog — "Siddur Torat Chacham — a siddur Rashash" (2024)](https://kavvanah.blog/2024/11/23/siddur-torat-chacham-a-siddur-rashash-by-r-yitzchak-meir-morgenstern/)

## שיעורי שמע (אודיו)

- [Kesertorah.org — קטלוג שיעורי קבלה (כולל שיעורים על הרש"ש)](https://kesertorah.org/all-shiurim/)
- [Kabbalah Empowerment — ד' עקרי רחובות הנהר](https://www.kabbalahempowerment.com/rabbi-shalom-sharabi-rechovo-hanahar/)

## לרכישת הספר עם פירושים

- [Seforim Center — נהר שלום עם פירוש "שמן ששון" ו"שמן זית זך"](https://seforimcenter.com/Nahar-Shalom-with-Famous-Commentaries__p-14106.aspx)`;

// ---------------------------------------------------------------------------
// Modules definition
// ---------------------------------------------------------------------------
type ModuleRow = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
};

const MODULES: ModuleRow[] = [
  { id: IDS.m1, course_id: IDS.course, order_index: 0,
    title: 'מבוא: הרש"ש וחייו',
    description: 'קורות חיי הרש"ש, מקומו בשרשרת הקבלה, וסקירת חיבוריו.' },
  { id: IDS.m2, course_id: IDS.course, order_index: 1,
    title: 'רחובות הנהר — ד׳ עקרי השיטה',
    description: 'ד׳ העקרים שקבע הרש"ש כבסיס ללימוד כתבי האר"י.' },
  { id: IDS.m3, course_id: IDS.course, order_index: 2,
    title: 'יסודות הקבלה הלוריאנית',
    description: 'צמצום, עולמות, ספירות ופרצופים — כפי שמפרש אותם הרש"ש.' },
  { id: IDS.m4, course_id: IDS.course, order_index: 3,
    title: 'שאלות א–כ: כוונות התפילה היומית',
    description: 'עשרים השאלות הראשונות: כוונות ברכות השחר, שמע ועמידה.' },
  { id: IDS.m5, course_id: IDS.course, order_index: 4,
    title: 'שאלות כא–מה: כוונות פרטיות',
    description: 'כוונות "אמן", מגן אברהם, קדושה ועוד.' },
  { id: IDS.m6, course_id: IDS.course, order_index: 5,
    title: 'שאלות מו–ע: כוונות מצוות ומועדות',
    description: 'כוונות הלל, מזוזה, וסיכום שיטת הרש"ש.' },
  { id: IDS.m7, course_id: IDS.course, order_index: 6,
    title: 'סדר כוונות שחרית',
    description: 'הכוונות המלאות לתפילת שחרית לפי סידור נהר שלום.' },
  { id: IDS.m8, course_id: IDS.course, order_index: 7,
    title: 'כוונות שבת, ראש השנה ויום כיפור',
    description: 'כוונות ליל שבת, שחרית שבת, מוסף, ר"ה ויוה"כ.' },
];

// ---------------------------------------------------------------------------
// Content items — each module's lessons, links, quizzes
// ---------------------------------------------------------------------------
type ContentRow = {
  moduleId: string;
  title: string;
  type: 'MARKDOWN' | 'LINK' | 'QUIZ';
  content: string;
  orderIndex: number;
};

const CONTENT_ITEMS: ContentRow[] = [
  // Module 1 — Introduction
  { moduleId: IDS.m1, orderIndex: 0, type: 'MARKDOWN',
    title: 'הרש"ש — ביוגרפיה ומקומו בקבלה', content: BIO_MD },
  { moduleId: IDS.m1, orderIndex: 1, type: 'LINK',
    title: 'ספר נהר שלום — HebrewBooks.org (ציבורי, חינמי)',
    content: 'https://hebrewbooks.org/21991' },
  { moduleId: IDS.m1, orderIndex: 2, type: 'LINK',
    title: 'שיעורים ומאמרים חיצוניים על הרש"ש', content: SHIURIM_LINK_MD },
  { moduleId: IDS.m1, orderIndex: 3, type: 'QUIZ',
    title: 'חידון: הרש"ש — ביוגרפיה',
    content: JSON.stringify({
      questions: [
        { q: 'באיזו עיר נולד הרש"ש?', options: ['ירושלים', 'צנעא', 'צפת', 'קהיר'], answer: 1 },
        { q: 'מי היה רבו של הרש"ש שגילה את גדלותו?', options: ['ר"ח ויטאל', 'ר"ג חייון', 'האר"י', 'הבעש"ט'], answer: 1 },
        { q: 'מהו השם המלא של ספר נהר שלום?', options: ['שו"ת לע\' שאלות', 'כוונות לאר"י', 'עץ חיים', 'שערי קדושה'], answer: 0 },
        { q: 'באיזו שנה נפטר הרש"ש?', options: ['תק"י', 'תקל"ז', 'תק"נ', 'תר"כ'], answer: 1 },
        { q: 'מה אמר הרב קדורי על רחובות הנהר?', options: ['שצריך ללמוד בחיפזון', 'שעד שלא למדת אותו לא למדת קבלה', 'שהוא לרמה גבוהה בלבד', 'שהוא ספר ציוני'], answer: 1 },
      ],
    }) },

  // Module 2 — Rehovot HaNahar
  { moduleId: IDS.m2, orderIndex: 0, type: 'MARKDOWN',
    title: 'רחובות הנהר — מבוא וד׳ עקרים', content: REHOVOT_MD },
  { moduleId: IDS.m2, orderIndex: 1, type: 'LINK',
    title: 'טקסט מקורי: רחובות הנהר, נהר שלום דף ל"ב ע"א',
    content: 'https://hebrewbooks.org/pdfpager.aspx?req=21991&pgnum=32' },
  { moduleId: IDS.m2, orderIndex: 2, type: 'LINK',
    title: 'מאמר: "ד׳ עקרי הרש"ש" — Kabbalah Empowerment',
    content: 'https://www.kabbalahempowerment.com/rabbi-shalom-sharabi-rechovo-hanahar/' },
  { moduleId: IDS.m2, orderIndex: 3, type: 'QUIZ',
    title: 'חידון: ד׳ עקרי רחובות הנהר',
    content: JSON.stringify({
      questions: [
        { q: 'על מה מסתמך הרש"ש לפי עיקר א?', options: ['הזוהר', 'כתבי האר"י בלבד', 'הרמב"ם', 'ספר יצירה'], answer: 1 },
        { q: 'מה עושים כשיש סתירה בין מקומות לפי עיקר ב?', options: ['הולכים לפי המאוחר', 'משוים ומתיישבים', 'בוחרים כרצוננו', 'שואלים פוסק'], answer: 1 },
        { q: 'לפי עיקר ג, אילו כתבים גוברים?', options: ['הקדומים', 'המאוחרים', 'הסודיים', 'הגלויים'], answer: 1 },
      ],
    }) },

  // Module 3 — Foundations
  { moduleId: IDS.m3, orderIndex: 0, type: 'MARKDOWN',
    title: 'הצמצום — יסוד הבריאה', content: TZIMTZUM_MD },
  { moduleId: IDS.m3, orderIndex: 1, type: 'MARKDOWN',
    title: 'הספירות העשר והפרצופים', content: SEFIROT_MD },
  { moduleId: IDS.m3, orderIndex: 2, type: 'LINK',
    title: 'מאמר אקדמי: "Lurianic Kavvanot: from Vital to Rashash" (2025)',
    content: 'https://kavvanah.blog/2025/08/25/lurianic-kavvanot-from-vital-to-rashash-to-zhidichov-jeremy-tibbetts/' },
  { moduleId: IDS.m3, orderIndex: 3, type: 'QUIZ',
    title: 'חידון: יסודות הקבלה הלוריאנית',
    content: JSON.stringify({
      questions: [
        { q: 'מהו הצמצום?', options: ['ירידת האדם', 'כיווץ האור האלוקי לאפשר בריאה', 'תפילה בלחש', 'שמירת מצוות'], answer: 1 },
        { q: 'מה נשאר בחלל אחרי הצמצום?', options: ['אין כלום', 'רשימו וקו', 'מלאכים', 'כוכבים'], answer: 1 },
        { q: 'כמה ספירות יש?', options: ['7', '10', '12', '22'], answer: 1 },
        { q: 'איזה פרצוף מקביל לבינה?', options: ['אבא', 'אמא', 'ז"א', 'עתיק'], answer: 1 },
        { q: 'מהו עולם האצילות?', options: ['עולם הגשמי', 'עולם המלאכים', 'עולם האלוהות', 'עולם הנשמות'], answer: 2 },
      ],
    }) },

  // Module 4 — Questions 1–20
  { moduleId: IDS.m4, orderIndex: 0, type: 'MARKDOWN',
    title: 'שאלות א–כ: כוונות ברכות השחר, שמע ועמידה', content: Q1_20_MD },
  { moduleId: IDS.m4, orderIndex: 1, type: 'LINK',
    title: 'נהר שלום דף א–כ — HebrewBooks.org',
    content: 'https://hebrewbooks.org/21991' },
  { moduleId: IDS.m4, orderIndex: 2, type: 'QUIZ',
    title: 'חידון: שאלות א–כ',
    content: JSON.stringify({
      questions: [
        { q: 'לאיזה ספירה מכוונת ברכת "על נטילת ידים"?', options: ['כתר', 'מלכות', 'יסוד', 'תפארת'], answer: 2 },
        { q: 'מה הכוונה במילה "אחד" בשמע ישראל לפי הרש"ש?', options: ['אחדות ישראל', 'יחוד ז"א ונוקבא', 'אחד הוא ה\'', 'אחדות הספירות'], answer: 1 },
        { q: 'כנגד מה מכוונות ג\' ברכות הראשונות בעמידה?', options: ['ג\' אבות', 'אמא מעלה ז"א', 'ג\' עולמות', 'ג\' תפילות'], answer: 1 },
      ],
    }) },

  // Module 5 — Questions 21–45
  { moduleId: IDS.m5, orderIndex: 0, type: 'MARKDOWN',
    title: 'שאלות כא–מה: כוונות אמן, מגן אברהם וקדושה', content: Q21_45_MD },
  { moduleId: IDS.m5, orderIndex: 1, type: 'LINK',
    title: 'נהר שלום דף כא–מה — HebrewBooks.org',
    content: 'https://hebrewbooks.org/21991' },
  { moduleId: IDS.m5, orderIndex: 2, type: 'QUIZ',
    title: 'חידון: שאלות כא–מה',
    content: JSON.stringify({
      questions: [
        { q: '"אמן" בגימטריה שווה?', options: ['72', '91', '26', '65'], answer: 1 },
        { q: 'אברהם מקביל לאיזה ספירה?', options: ['גבורה', 'חסד', 'תפארת', 'כתר'], answer: 1 },
        { q: 'שלש פעמים "קדוש" בקדושה מכוונות לאיזה עולמות?', options: ['ג\' אבות', 'אצילות בריאה יצירה', 'ז"א ונוקבא', 'ג\' ספירות'], answer: 1 },
      ],
    }) },

  // Module 6 — Questions 46–70
  { moduleId: IDS.m6, orderIndex: 0, type: 'MARKDOWN',
    title: 'שאלות מו–ע: הלל, מזוזה וסיכום השיטה', content: Q46_70_MD },
  { moduleId: IDS.m6, orderIndex: 1, type: 'LINK',
    title: 'נהר שלום דף מו–ע — HebrewBooks.org',
    content: 'https://hebrewbooks.org/21991' },
  { moduleId: IDS.m6, orderIndex: 2, type: 'QUIZ',
    title: 'חידון: שאלות מו–ע',
    content: JSON.stringify({
      questions: [
        { q: 'ה"הלל" מסדר את מה?', options: ['עולם הבריאה', 'פרצופי אצילות', 'תיקון הניצוצות', 'שם הוי"ה'], answer: 0 },
        { q: 'שם שד"י במזוזה מקביל לאיזה ספירה?', options: ['מלכות', 'כתר', 'יסוד', 'תפארת'], answer: 2 },
        { q: 'מה אמר הרש"ש בתשובה האחרונה (שאלה ע)?', options: ['יש לפסוק כרמב"ם', 'לא לזוז מכתבי האר"י', 'לקבל כל פירוש', 'לשאול רב'], answer: 1 },
      ],
    }) },

  // Module 7 — Kavvanot Shacharit
  { moduleId: IDS.m7, orderIndex: 0, type: 'MARKDOWN',
    title: 'סדר כוונות שחרית לפי הרש"ש', content: SHACHARIT_MD },
  { moduleId: IDS.m7, orderIndex: 1, type: 'LINK',
    title: 'סידור נהר שלום — שחרית (HebrewBooks.org)',
    content: 'https://hebrewbooks.org/21991' },
  { moduleId: IDS.m7, orderIndex: 2, type: 'QUIZ',
    title: 'חידון: כוונות שחרית',
    content: JSON.stringify({
      questions: [
        { q: 'כוונת תפילין של יד היא ספירת?', options: ['כתר', 'יסוד', 'מלכות', 'חכמה'], answer: 2 },
        { q: 'פסוקי דזמרה מסדרים את עולם?', options: ['האצילות', 'הבריאה', 'היצירה', 'העשיה'], answer: 1 },
        { q: 'מנהג ישיבת בית אל לאחר תפילה?', options: ['ארוחת בוקר', 'שיעור בעץ חיים ונהר שלום', 'מנוחה', 'עבודה'], answer: 1 },
      ],
    }) },

  // Module 8 — Kavvanot Shabbat
  { moduleId: IDS.m8, orderIndex: 0, type: 'MARKDOWN',
    title: 'כוונות שבת, ראש השנה ויום כיפור', content: SHABBAT_MD },
  { moduleId: IDS.m8, orderIndex: 1, type: 'LINK',
    title: 'סידור נהר שלום — שבת ומועד (HebrewBooks.org)',
    content: 'https://hebrewbooks.org/21955' },
  { moduleId: IDS.m8, orderIndex: 2, type: 'QUIZ',
    title: 'חידון: כוונות שבת',
    content: JSON.stringify({
      questions: [
        { q: 'באיזה עולם מאיר שבת לפי הרש"ש?', options: ['הבריאה', 'היצירה', 'האצילות', 'העשיה'], answer: 2 },
        { q: 'מוסף שבת מכוון כנגד?', options: ['תפארת', 'כתר', 'יסוד', 'מלכות'], answer: 1 },
        { q: 'כוונת נר הבדלה היא?', options: ['חסד', 'גבורה', 'יסוד', 'נצח'], answer: 1 },
      ],
    }) },
];

// ---------------------------------------------------------------------------
// Kabbalistic concepts for the knowledge graph (Apache AGE)
// ---------------------------------------------------------------------------
async function seedKabbalisticConcepts(db: ReturnType<typeof createDatabaseConnection>): Promise<void> {
  const concepts: Array<{ name: string; definition: string }> = [
    { name: 'צמצום', definition: 'כיווץ האור האלוקי שאפשר בריאת עולמות מוגבלים' },
    { name: 'רשימו', definition: 'רושם עדין של האור שנשאר בחלל לאחר הצמצום' },
    { name: 'קו', definition: 'קו אור דק שנכנס לחלל מהאין סוף לאחר הצמצום' },
    { name: 'אצילות', definition: 'עולם האצילות — עולם האלוהות, הגבוה בארבעה עולמות' },
    { name: 'בריאה', definition: 'עולם הבריאה — עולם נשמות הצדיקים ובינה' },
    { name: 'יצירה', definition: 'עולם היצירה — עולם המלאכים' },
    { name: 'עשיה', definition: 'עולם העשיה — העולם הגשמי' },
    { name: 'ספירות', definition: 'עשרת הכוחות האלוקיים: כתר חכמה בינה חסד גבורה תפארת נצח הוד יסוד מלכות' },
    { name: 'פרצופים', definition: 'מבנים מורכבים של הספירות: עתיק, אריך, אבא, אמא, ז"א, נוקבא' },
    { name: 'כוונות', definition: 'כוונות — מחשבות מיסטיות מכוונות בעת התפילה ועשיית מצוות' },
    { name: 'תיקון', definition: 'תיקון — תהליך תיקון השברים שנגרמו בשבירת הכלים' },
    { name: 'שבירת הכלים', definition: 'שבירת הכלים — שבירת ספירות עולם הנקודים שאפשרה בריאת הרע' },
    { name: 'נהר שלום', definition: 'ספר שו"ת הרש"ש — ע\' תשובות לחכמי תוניס על ענייני קבלה וכוונות' },
    { name: 'רחובות הנהר', definition: 'הקדמת הרש"ש לנהר שלום — ד\' עקרים ללימוד כתבי האר"י' },
    { name: 'הרש"ש', definition: 'רבי שלום שרעבי (1720–1777) — ראש ישיבת בית אל, מפרש כוונות האר"י' },
  ];

  for (const concept of concepts) {
    // MERGE is idempotent — safe to re-run
    await executeCypher(
      db as Parameters<typeof executeCypher>[0],
      GRAPH_NAME,
      `MERGE (c:Concept {name: '${concept.name}', tenant_id: '${DEMO_TENANT}'})
       SET c.definition = '${concept.definition.replace(/'/g, "\\'")}',
           c.updated_at = timestamp()
       RETURN c`
    );
  }

  // Relationships
  const relationships: Array<[string, string, string]> = [
    ['צמצום', 'PRECEDES', 'רשימו'],
    ['צמצום', 'PRECEDES', 'קו'],
    ['קו', 'ENABLES', 'ספירות'],
    ['ספירות', 'COMPOSE', 'פרצופים'],
    ['ספירות', 'EXIST_IN', 'אצילות'],
    ['ספירות', 'EXIST_IN', 'בריאה'],
    ['ספירות', 'EXIST_IN', 'יצירה'],
    ['ספירות', 'EXIST_IN', 'עשיה'],
    ['שבירת הכלים', 'REQUIRES', 'תיקון'],
    ['כוונות', 'RELATE_TO', 'ספירות'],
    ['כוונות', 'RELATE_TO', 'פרצופים'],
    ['הרש"ש', 'AUTHORED', 'נהר שלום'],
    ['הרש"ש', 'AUTHORED', 'רחובות הנהר'],
    ['רחובות הנהר', 'PART_OF', 'נהר שלום'],
    ['נהר שלום', 'TEACHES', 'כוונות'],
  ];

  for (const [from, rel, to] of relationships) {
    await executeCypher(
      db as Parameters<typeof executeCypher>[0],
      GRAPH_NAME,
      `MATCH (a:Concept {name: '${from}', tenant_id: '${DEMO_TENANT}'})
       MATCH (b:Concept {name: '${to}', tenant_id: '${DEMO_TENANT}'})
       MERGE (a)-[:${rel}]->(b)`
    );
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export async function seedNaharShalomCourse(): Promise<void> {
  const db = createDatabaseConnection();

  // 1. Instructor
  await db.insert(schema.users).values({
    id: IDS.instructor,
    tenant_id: DEMO_TENANT,
    email: 'kabbalah.instructor@edusphere.dev',
    display_name: 'ר\' מרדכי כהן — מקובל',
    first_name: 'מרדכי',
    last_name: 'כהן',
    role: 'INSTRUCTOR',
  }).onConflictDoNothing();

  // 2. Course
  await db.insert(schema.courses).values({
    id: IDS.course,
    tenant_id: DEMO_TENANT,
    title: 'נהר שלום — פנינים מאוצר הרש"ש',
    slug: 'nahar-shalom-rashash',
    description:
      'לימוד שיטתי של ספר נהר שלום לרבי שלום שרעבי (הרש"ש). ' +
      'הקורס כולל: ביוגרפיה, ד\' עקרי רחובות הנהר, ע\' תשובות, ' +
      'וסדר הכוונות המלא לשחרית, שבת ומועד.',
    creator_id: IDS.instructor,
    instructor_id: IDS.instructor,
    is_published: true,
    is_public: true,
    estimated_hours: 40,
    tags: ['קבלה', 'הרש"ש', 'נהר-שלום', 'כוונות', 'לוריאנית'],
  }).onConflictDoNothing();

  // 3. Modules
  await db.insert(schema.modules).values(MODULES).onConflictDoNothing();

  // 4. Content items (using camelCase per contentItems.ts schema)
  for (const item of CONTENT_ITEMS) {
    await db.insert(schema.contentItems).values({
      moduleId: item.moduleId,
      title: item.title,
      type: item.type,
      content: item.content,
      orderIndex: item.orderIndex,
    }).onConflictDoNothing();
  }

  // 5. Knowledge graph
  try {
    await seedKabbalisticConcepts(db);
  } catch {
    // Graph may not be initialized in all environments; skip gracefully
    console.warn('⚠️  Knowledge graph unavailable — skipping Kabbalistic concepts');
  }

  console.log('✅ נהר שלום course seeded: 8 modules, 27 content items, 15 graph concepts');
}
