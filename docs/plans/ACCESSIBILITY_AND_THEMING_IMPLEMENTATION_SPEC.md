# EduSphere — Accessibility & Multi-Tenant Theming Implementation Spec

**Date:** March 2026
**Status:** Implementation-Ready Spec
**Scope:** WCAG 2.2 AAA for EdTech + Multi-Tenant Theme Architecture
**Stack:** React 19 + Tailwind CSS v4 + shadcn/ui (Radix UI) + Drizzle ORM + PostgreSQL

---

## Table of Contents

1. [Section 1: WCAG 2.2 AAA Implementation Spec for EduSphere](#section-1)
   - 1.1 Contrast Ratios
   - 1.2 Keyboard Navigation
   - 1.3 ARIA Roles and Live Regions
   - 1.4 Screen Reader Compatibility
   - 1.5 Accessible Video Player
   - 1.6 Accessible Form Patterns
   - 1.7 prefers-reduced-motion
   - 1.8 Dyslexia-Friendly Typography
   - 1.9 Radix UI / shadcn/ui Patterns
   - 1.10 EdTech-Specific Criteria
   - 1.11 Testing Checklist

2. [Section 2: Multi-Tenant Theme Architecture Spec](#section-2)
   - 2.1 Three-Tier Token Architecture
   - 2.2 CSS Custom Properties Structure
   - 2.3 Tailwind CSS v4 Integration
   - 2.4 PostgreSQL Database Schema
   - 2.5 React Context Theme Provider
   - 2.6 Real-Time Preview
   - 2.7 Dark Mode Integration
   - 2.8 Industry Comparisons

---

## Section 1: WCAG 2.2 AAA Implementation Spec for EduSphere {#section-1}

### Strategic Context

Legal baseline for EduSphere: **WCAG 2.1 Level AA** (ADA Title II, DOJ Final Rule Apr 2024; EAA Jun 2025).
Target: **WCAG 2.2 Level AAA** for premium EdTech differentiation, particularly for institutional (K-12, higher ed) clients.

The new WCAG 2.2 success criteria relevant to EduSphere:
- 2.4.11 Focus Not Obscured Minimum (AA)
- 2.4.12 Focus Not Obscured Enhanced (AAA) — new
- 2.4.13 Focus Appearance (AAA) — new
- 2.5.7 Dragging Movements (AA) — new
- 2.5.8 Target Size Minimum (AA) — new
- 3.3.7 Redundant Entry (A) — new
- 3.3.8 Accessible Authentication Minimum (AA) — new
- 3.3.9 Accessible Authentication Enhanced (AAA) — new (no cognitive tests at all)

---

### 1.1 Contrast Ratios

#### Standards Table

| Level | Normal Text | Large Text (18pt / 14pt bold) | UI Components & Graphics |
|-------|-------------|-------------------------------|--------------------------|
| AA    | 4.5:1       | 3:1                           | 3:1                      |
| AAA   | 7:1         | 4.5:1                         | 3:1 (no AAA for non-text) |

**Focus indicators (WCAG 2.4.13 AAA):** The focus outline area must be at least as large as a 2 CSS pixel perimeter of the component, with 3:1 contrast between focused and unfocused states.

#### EduSphere Color Token Targets (AAA)

```css
/* Minimum contrast targets for EduSphere brand tokens */
/* All ratios measured against the page background */

:root {
  /* Primary text on white: must achieve 7:1 → use ≥ #595959 on white */
  --color-text-primary: #1a1a1a;      /* ~17:1 on white — far exceeds AAA */
  --color-text-secondary: #4a4a4a;    /* ~9.5:1 on white — AAA */
  --color-text-muted: #595959;        /* ~7:1 on white — AAA threshold */
  --color-text-on-dark: #ffffff;      /* 21:1 on dark backgrounds */

  /* Interactive elements: 3:1 minimum for UI components */
  --color-border-focus: #0052cc;      /* Focus ring color */
  --color-interactive: #0052cc;      /* Links, buttons */
  --color-interactive-hover: #003d99; /* Hover state */
}
```

#### TypeScript: Contrast Validation Utility

```typescript
// packages/accessibility/src/contrast.ts

/**
 * Calculate WCAG contrast ratio between two hex colors.
 * Returns a ratio like 7.2 (meaning 7.2:1).
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const sRGB = channel / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

export type ContrastLevel = 'fail' | 'AA' | 'AAA';

export function getContrastLevel(
  ratio: number,
  isLargeText: boolean,
): ContrastLevel {
  if (isLargeText) {
    if (ratio >= 4.5) return 'AAA';
    if (ratio >= 3.0) return 'AA';
    return 'fail';
  }
  if (ratio >= 7.0) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'fail';
}
```

---

### 1.2 Keyboard Navigation

#### Skip Links (Mandatory — WCAG 2.4.1 A)

Every page must render skip links as the first focusable elements. They are visually hidden until focused.

```tsx
// apps/web/src/components/accessibility/SkipLinks.tsx
import { useTranslation } from 'react-i18next';

const SKIP_TARGETS = [
  { href: '#main-content', labelKey: 'a11y.skipToMain' },
  { href: '#primary-nav', labelKey: 'a11y.skipToNav' },
  { href: '#course-content', labelKey: 'a11y.skipToContent' },
] as const;

export function SkipLinks() {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('a11y.skipLinksLabel')}>
      {SKIP_TARGETS.map(({ href, labelKey }) => (
        <a
          key={href}
          href={href}
          className={[
            // Hidden off-screen by default
            'absolute left-[-9999px] top-auto w-px h-px overflow-hidden',
            // Visible and styled when focused
            'focus:fixed focus:left-4 focus:top-4 focus:w-auto focus:h-auto',
            'focus:overflow-visible focus:z-[9999]',
            'focus:bg-[--color-interactive] focus:text-white',
            'focus:px-6 focus:py-3 focus:rounded focus:no-underline',
            'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2',
          ].join(' ')}
        >
          {t(labelKey)}
        </a>
      ))}
    </nav>
  );
}
```

#### Focus Management After Route Changes

React Router does not restore focus after navigation. Implement a focus manager:

```tsx
// apps/web/src/hooks/useFocusOnRouteChange.ts
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function useFocusOnRouteChange() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef<string>(location.pathname);

  useEffect(() => {
    if (location.pathname !== previousPath.current) {
      previousPath.current = location.pathname;
      // Move focus to main content after navigation
      // Small delay allows React to finish rendering the new route
      const timer = setTimeout(() => {
        mainRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return mainRef;
}

// Usage in AppLayout.tsx:
// const mainRef = useFocusOnRouteChange();
// <main id="main-content" ref={mainRef} tabIndex={-1} className="outline-none">
```

#### Modal Focus Trapping

Radix UI Dialog handles focus trapping automatically. For custom modals:

```tsx
// apps/web/src/hooks/useFocusTrap.ts
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
    );
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}
```

#### Keyboard Navigation Patterns (ARIA Authoring Practices)

| Component | Required Keys | Implementation |
|-----------|---------------|----------------|
| Button | Enter, Space | `<button>` native |
| Link | Enter | `<a href>` native |
| Checkbox | Space | Radix Checkbox |
| Radio group | Arrow keys | Radix RadioGroup |
| Select / Listbox | Arrow keys, Home, End, type-ahead | Radix Select |
| Menu | Arrow keys, Enter, Escape, type-ahead | Radix DropdownMenu |
| Tabs | Left/Right arrows (or Up/Down vertical), Home, End | Radix Tabs |
| Dialog | Tab trapped, Escape to close | Radix Dialog |
| Slider | Arrow keys, Home, End, Page Up/Down | Radix Slider |
| Quiz / Drag-and-drop | Arrow keys + Enter/Space for keyboard drop | Custom (see below) |

#### Focus Appearance (WCAG 2.4.13 AAA)

```css
/* apps/web/src/styles/focus.css */
/* Applied globally — satisfies AAA: 2px perimeter + 3:1 contrast ratio */

:root {
  --focus-ring-color: #0052cc;
  --focus-ring-width: 3px;
  --focus-ring-offset: 2px;
}

/* Global focus style — never remove outlines without replacing them */
:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  border-radius: 2px;
}

/* High contrast mode support */
@media (forced-colors: active) {
  :focus-visible {
    outline: 3px solid ButtonText;
  }
}
```

```tsx
// Tailwind equivalent — add to global CSS or use ring utilities:
// className="focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[--focus-ring-color] focus-visible:ring-offset-2"
```

---

### 1.3 ARIA Roles and Live Regions

#### Global Live Region Architecture

Place two persistent live region containers at the root of the app. Use a singleton announcer pattern (react-aria's `announce` function is the most reliable cross-browser approach):

```tsx
// apps/web/src/components/accessibility/LiveRegions.tsx
// Render this ONCE in AppLayout, before the main content

export function LiveRegions() {
  return (
    <>
      {/* Polite: non-urgent updates (quiz score, save confirmation, progress) */}
      <div
        id="aria-live-polite"
        aria-live="polite"
        aria-atomic="true"
        aria-relevant="additions text"
        className="sr-only"
      />
      {/* Assertive: urgent alerts (session timeout, error saving work) */}
      <div
        id="aria-live-assertive"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}
```

```css
/* sr-only utility — hides visually but keeps accessible to screen readers */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

#### Announcer Hook

```tsx
// apps/web/src/hooks/useAnnounce.ts
import { useCallback } from 'react';

type Politeness = 'polite' | 'assertive';

export function useAnnounce() {
  const announce = useCallback(
    (message: string, politeness: Politeness = 'polite') => {
      const regionId =
        politeness === 'assertive'
          ? 'aria-live-assertive'
          : 'aria-live-polite';
      const region = document.getElementById(regionId);
      if (!region) return;

      // Clear then set — ensures re-announcement of the same message
      region.textContent = '';
      // rAF ensures the DOM update registers as a new change
      requestAnimationFrame(() => {
        region.textContent = message;
      });
    },
    [],
  );

  return { announce };
}
```

#### EdTech-Specific Live Region Usage

```tsx
// Quiz results announcement
const { announce } = useAnnounce();

const handleQuizSubmit = async (answers: QuizAnswers) => {
  const result = await submitQuiz(answers);
  // Announce result without moving focus
  announce(
    `Quiz submitted. You scored ${result.score} out of ${result.total}. ${
      result.passed ? 'Congratulations, you passed!' : 'Please review and retry.'
    }`,
    'polite',
  );
};

// Progress update announcement
announce(`Lesson progress: ${progress}% complete`, 'polite');

// Chat message announcement (Collaboration subgraph)
// aria-live="polite" + aria-atomic="false" + aria-relevant="additions"
// so only NEW messages are announced, not the entire history
```

#### Key ARIA Roles for EduSphere Components

```tsx
// Course card list
<ul role="list" aria-label="Available courses">
  <li role="article">...</li>
</ul>

// Progress bar
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Lesson completion progress"
>
  <div style={{ width: `${progress}%` }} />
</div>

// Quiz question
<fieldset>
  <legend>Question {number}: {questionText}</legend>
  <ul role="list">
    {options.map((option) => (
      <li key={option.id}>
        <label>
          <input
            type="radio"
            name={`question-${questionId}`}
            value={option.id}
            aria-describedby={`q${questionId}-hint`}
          />
          {option.text}
        </label>
      </li>
    ))}
  </ul>
  <p id={`q${questionId}-hint`} className="sr-only">
    Select one answer and press Tab to move to the next question.
  </p>
</fieldset>

// Navigation landmark
<nav aria-label="Course chapters">
  <ol>
    <li aria-current={isCurrent ? 'page' : undefined}>...</li>
  </ol>
</nav>

// Status messages (WCAG 4.1.3 AA)
<div role="status" aria-live="polite">
  {saveStatus === 'saved' && 'All changes saved'}
</div>
```

---

### 1.4 Screen Reader Compatibility

#### Testing Matrix (Mandatory Before Release)

| Screen Reader | Browser | OS | Priority |
|---------------|---------|-----|----------|
| NVDA 2024     | Chrome, Firefox | Windows 11 | P1 |
| JAWS 2024     | Chrome, Edge | Windows 11 | P1 |
| VoiceOver     | Safari | macOS/iOS | P1 |
| TalkBack      | Chrome | Android | P2 |
| Narrator      | Edge | Windows 11 | P3 |

#### Screen Reader Navigation Shortcuts to Verify

- Heading navigation (H key in NVDA/JAWS): Every page must have logical heading hierarchy (h1 > h2 > h3, no skips)
- Landmark navigation (D for landmarks): Verify `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` exist
- Form navigation (F key): All form controls must be reachable and labeled
- Button/link lists (B/K keys): All interactive elements have descriptive names
- Table navigation: Data tables have `<caption>`, `<th scope>` headers

#### Component Naming Patterns

```tsx
// Icon-only buttons MUST have accessible name
<button aria-label="Close dialog" type="button">
  <XIcon aria-hidden="true" />
</button>

// Decorative images must be hidden
<img src="decoration.svg" alt="" aria-hidden="true" />

// Informative images need descriptive alt
<img
  src="chart.png"
  alt="Bar chart showing course completion rates: JavaScript 78%, React 65%, TypeScript 45%"
/>

// Status icons with text — hide the icon, let text speak
<span className="flex items-center gap-2">
  <CheckCircleIcon aria-hidden="true" className="text-green-600" />
  <span>Assignment submitted successfully</span>
</span>

// Status icons without text — icon must carry the label
<span aria-label="Assignment submitted successfully">
  <CheckCircleIcon aria-hidden="true" className="text-green-600" />
</span>

// Link purpose (WCAG 2.4.9 AAA — link purpose from link text alone)
// BAD: <a href="/course/123">Click here</a>
// GOOD:
<a href="/course/123">
  Introduction to Machine Learning
  <span className="sr-only"> — course details</span>
</a>
```

---

### 1.5 Accessible Video Player

EduSphere uses a custom video player for lesson content. The following requirements map to WCAG 1.2.x criteria.

#### WCAG Video Requirements by Level

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 1.2.1 Audio/Video-only (prerecorded) | A | Text alternative or audio track |
| 1.2.2 Captions (prerecorded) | A | Synchronized captions |
| 1.2.3 Audio Description or Media Alt | A | AD or text transcript |
| 1.2.4 Captions (live) | AA | Live captions for webinars |
| 1.2.5 Audio Description (prerecorded) | AA | Full AD track |
| 1.2.6 Sign Language (prerecorded) | AAA | Sign language interpretation |
| 1.2.7 Extended Audio Description | AAA | Paused video for longer AD |
| 1.2.8 Media Alternative (prerecorded) | AAA | Full text alternative |
| 1.2.9 Audio-only (live) | AAA | Live text alternative |

#### Video Player Component Requirements

```tsx
// apps/web/src/components/video/AccessibleVideoPlayer.tsx

interface VideoPlayerProps {
  src: string;
  captionTracks: CaptionTrack[];    // WebVTT files per language
  audioDescriptionSrc?: string;     // Separate AD audio track
  transcript?: string;              // Full text transcript
  title: string;
  posterSrc?: string;
}

interface CaptionTrack {
  src: string;       // URL to .vtt file
  srclang: string;   // e.g. 'en', 'he'
  label: string;     // e.g. 'English', 'Hebrew'
  kind: 'captions' | 'subtitles' | 'descriptions';
  default?: boolean;
}
```

#### Keyboard Controls (All Required)

| Key | Action | ARIA Announcement |
|-----|--------|-------------------|
| Space / K | Play / Pause | "Playing" / "Paused" |
| M | Mute / Unmute | "Muted" / "Unmuted, volume X%" |
| F | Fullscreen toggle | "Fullscreen" / "Exit fullscreen" |
| C | Captions toggle | "Captions on: English" / "Captions off" |
| Left / Right arrow | Seek ±5 seconds | "Position: X minutes Y seconds" |
| Up / Down arrow | Volume ±10% | "Volume: X%" |
| Home / End | Jump to start/end | "Beginning of video" / "End of video" |
| 0–9 | Jump to 0–90% | "Jumped to X%" |

```tsx
// Video controls toolbar pattern
<div
  role="toolbar"
  aria-label="Video controls"
  aria-controls="video-player"
>
  <button
    type="button"
    onClick={togglePlay}
    aria-label={isPlaying ? 'Pause video' : 'Play video'}
    aria-pressed={isPlaying}
  >
    {isPlaying ? <PauseIcon aria-hidden="true" /> : <PlayIcon aria-hidden="true" />}
  </button>

  <div
    role="slider"
    aria-label="Video progress"
    aria-valuemin={0}
    aria-valuemax={duration}
    aria-valuenow={currentTime}
    aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
    tabIndex={0}
    onKeyDown={handleProgressKeyDown}
  />

  <button
    type="button"
    onClick={toggleCaptions}
    aria-label={captionsEnabled ? 'Turn off captions' : 'Turn on captions'}
    aria-pressed={captionsEnabled}
  >
    <CaptionsIcon aria-hidden="true" />
  </button>
</div>
```

---

### 1.6 Accessible Form Patterns

#### Form Field Pattern (Error Announcement — WCAG 3.3.1, 3.3.3)

```tsx
// apps/web/src/components/forms/AccessibleField.tsx

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactElement;
}

export function AccessibleField({
  id,
  label,
  hint,
  error,
  required,
  children,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-[--color-text-primary]">
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-600 ml-1">*</span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>

      {hint && (
        <p id={hintId} className="text-sm text-[--color-text-secondary]">
          {hint}
        </p>
      )}

      {/* Clone child input with ARIA attributes */}
      {React.cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required,
      })}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-red-600 flex items-center gap-1"
        >
          <AlertCircleIcon aria-hidden="true" className="h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
```

#### Redundant Entry Prevention (WCAG 3.3.7 A — new in 2.2)

In multi-step flows (course enrollment, assessment), never ask for the same information twice:

```tsx
// If user entered name in Step 1, pre-fill it in Step 3
// Store form state in React state / Zustand, not re-query
const enrollmentStore = useEnrollmentStore();

// In Step 3:
<AccessibleField id="confirm-name" label="Confirm your name">
  <Input
    defaultValue={enrollmentStore.personalInfo.name}
    // User can correct if needed, but doesn't need to re-type from scratch
  />
</AccessibleField>
```

#### Accessible Authentication (WCAG 3.3.9 AAA — new in 2.2)

Authentication must not require any cognitive function test. For EduSphere:
- Login: Use Keycloak magic link (email link) or FIDO2/WebAuthn (passkey) as primary
- TOTP codes are acceptable if the user can copy-paste (not transcribe from a different device)
- CAPTCHA: Use an object recognition CAPTCHA (not text transcription) or allow audio alternative, OR prefer WebAuthn entirely

```tsx
// Passkey login button pattern
<button
  type="button"
  onClick={handlePasskeyLogin}
  className="btn-primary flex items-center gap-2"
>
  <FingerprintIcon aria-hidden="true" />
  Sign in with Passkey
</button>
```

---

### 1.7 prefers-reduced-motion

EduSphere uses animations for course transitions, quiz feedback, SRS flashcards, and progress bars. All must respect the OS-level reduced motion preference.

#### Global CSS Rule (Apply First)

```css
/* apps/web/src/styles/globals.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

#### React Hook for Component-Level Control

```tsx
// apps/web/src/hooks/useReducedMotion.ts
import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: no-preference)';

export function useReducedMotion(): boolean {
  // Default to true (no animations) — safe for SSR and initial render
  const [prefersReduced, setPrefersReduced] = useState(true);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(QUERY);
    // Set actual value once on client
    setPrefersReduced(!mediaQueryList.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReduced(!event.matches);
    };

    mediaQueryList.addEventListener('change', listener);
    return () => mediaQueryList.removeEventListener('change', listener);
  }, []);

  return prefersReduced;
}
```

#### Usage: SRS Flashcard Flip Animation

```tsx
// apps/web/src/components/srs/FlashCard.tsx
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function FlashCard({ front, back, isFlipped }: FlashCardProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className={[
        'flashcard',
        isFlipped ? 'flashcard--flipped' : '',
        reducedMotion ? 'flashcard--no-animation' : '',
      ].join(' ')}
      aria-live="polite"
    >
      <div className="flashcard__front" aria-hidden={isFlipped}>
        {front}
      </div>
      <div className="flashcard__back" aria-hidden={!isFlipped}>
        {back}
      </div>
    </div>
  );
}
```

```css
.flashcard {
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

.flashcard--flipped {
  transform: rotateY(180deg);
}

/* Reduced motion: instant state change instead of flip */
.flashcard--no-animation {
  transition: none;
}
```

#### User-Controlled Override

Allow users to set their own preference in their profile settings, stored in DB:

```tsx
// In UserPreferences, store `motion_preference: 'auto' | 'reduce' | 'full'`
// 'auto' = follow OS, 'reduce' = always reduce, 'full' = always full
```

---

### 1.8 Dyslexia-Friendly Typography

#### Font Choices

```css
/* Recommended dyslexia-friendly system font stack */
:root {
  /* Option A: System fonts with good letter spacing */
  --font-body: 'Arial', 'Helvetica Neue', system-ui, sans-serif;

  /* Option B: Open-source dyslexia-optimized fonts */
  /* OpenDyslexic — available via CDN */
  /* Atkinson Hyperlegible — designed by Braille Institute */
  --font-body-dyslexic: 'Atkinson Hyperlegible', 'OpenDyslexic', sans-serif;

  /* Default typography for AAA compliance */
  --font-size-base: 1rem;         /* 16px minimum */
  --line-height-base: 1.6;        /* WCAG 1.4.12: at least 1.5 */
  --letter-spacing-base: 0.05em;  /* WCAG 1.4.12: at least 0.12em */
  --word-spacing-base: 0.16em;    /* WCAG 1.4.12: at least 0.16em */
  --paragraph-spacing: 1.6em;     /* WCAG 1.4.12: at least 2x font size */
}
```

#### WCAG 1.4.12 Text Spacing (AA) — Must Not Break Layout

Layouts must tolerate:
- Line height at least 1.5x font size
- Letter spacing at least 0.12em
- Word spacing at least 0.16em
- Spacing between paragraphs at least 2x font size

```tsx
// User preference toggle for dyslexia mode
interface ReadingPreferences {
  fontFamily: 'default' | 'dyslexic';       // OpenDyslexic / Atkinson Hyperlegible
  fontSize: 'sm' | 'md' | 'lg' | 'xl';     // 14px / 16px / 18px / 22px
  lineHeight: 'normal' | 'relaxed' | 'loose'; // 1.4 / 1.7 / 2.0
  letterSpacing: 'normal' | 'wide';         // 0 / 0.08em
  wordSpacing: 'normal' | 'wide';           // 0 / 0.2em
  columnWidth: 'full' | 'narrow';           // 100% / 70ch max-width
}
```

```css
/* Applied via data attribute on <html> or content container */
[data-reading-mode="dyslexic"] {
  --font-body: 'Atkinson Hyperlegible', sans-serif;
  --line-height-base: 1.8;
  --letter-spacing-base: 0.08em;
  --word-spacing-base: 0.2em;
  --paragraph-spacing: 2em;
  /* Avoid justified text — uneven word gaps hurt dyslexic readers */
  text-align: left !important;
}

/* Narrow column mode: optimal reading width */
[data-reading-mode="narrow"] .lesson-content {
  max-width: 70ch;
  margin-inline: auto;
}
```

---

### 1.9 Radix UI / shadcn/ui Accessibility Patterns

Radix UI handles the following automatically — never override or re-implement:

| Component | Built-in Accessibility |
|-----------|------------------------|
| `Dialog` | Focus trap, Escape to close, `aria-modal`, `role="dialog"` |
| `DropdownMenu` | Arrow key navigation, Escape to close, type-ahead |
| `Select` | Keyboard selection, `aria-expanded`, `aria-selected` |
| `Tabs` | Arrow key navigation, `role="tablist"`, `aria-selected` |
| `Checkbox` | `role="checkbox"`, `aria-checked` including indeterminate |
| `RadioGroup` | `role="radio"`, Arrow key navigation |
| `Slider` | `role="slider"`, Arrow key, Home/End |
| `Tooltip` | Only shows on focus and hover, safe for keyboard users |
| `AlertDialog` | `role="alertdialog"`, focus trap, `aria-describedby` |

**Critical rules:**
1. Never use `<div onClick>` when a Radix primitive is available
2. Never add `outline: none` without replacing with a custom focus style
3. Always pass `aria-label` to icon-only Radix trigger buttons:

```tsx
// BAD: No accessible name
<DropdownMenu.Trigger>
  <DotsHorizontalIcon />
</DropdownMenu.Trigger>

// GOOD:
<DropdownMenu.Trigger asChild>
  <button type="button" aria-label="Course options menu">
    <DotsHorizontalIcon aria-hidden="true" />
  </button>
</DropdownMenu.Trigger>
```

---

### 1.10 EdTech-Specific Accessibility Criteria

#### Assessment / Quiz Accessibility

- **Time limits (WCAG 2.2.1 A):** All timed assessments must offer: (a) disable the time limit, or (b) extend it 10x. Store preference in user profile.
- **No loss on timeout (WCAG 2.2.5 AAA):** If a session expires during a quiz, save all answers and re-authenticate without loss.
- **Interruptions (WCAG 2.2.4 AAA):** AI coach pop-ups during lessons must be deferrable; do not interrupt during quiz.
- **Drag-and-drop (WCAG 2.5.7 AA — new):** All drag-and-drop exercises must have a keyboard-operable alternative (arrow keys to reorder, Enter to drop).

#### Flashing Content (WCAG 2.3.2 AAA)

No content may flash more than 3 times per second. Quiz celebration animations must be bounded.

#### Reading Level (WCAG 3.1.5 AAA)

Provide a "simplified" reading mode for course content that exceeds grade 9 reading level. AI-assisted summary generation can provide this.

---

### 1.11 Testing Checklist

#### Automated (Run in CI)

```bash
# jest-axe integration tests
pnpm --filter @edusphere/web test -- --testPathPattern="a11y"

# eslint-plugin-jsx-a11y (runs on every file write via MCP eslint)
# Already in packages/eslint-config

# Playwright accessibility scan
# Add to e2e/accessibility.spec.ts:
# import { checkA11y } from 'axe-playwright';
# await checkA11y(page);
```

#### Manual Screen Reader Checklist (Per Feature Release)

- [ ] Tab through entire feature without using mouse — all interactive elements reachable
- [ ] All live regions announce correctly in NVDA (Chrome) and VoiceOver (Safari)
- [ ] Quiz submission result announced without focus movement
- [ ] Video player controls all operable via keyboard
- [ ] All images have appropriate alt text or `aria-hidden="true"`
- [ ] No keyboard traps exist (except intentional modal traps)
- [ ] Focus never disappears (visible at all times)
- [ ] Skip links appear on first Tab press
- [ ] Heading hierarchy is logical (no skipped levels)
- [ ] Form errors announced immediately on submit

---

## Section 2: Multi-Tenant Theme Architecture Spec {#section-2}

### Strategic Context

EduSphere serves enterprise tenants (universities, corporations, K-12 districts) who need their own branding. The architecture must support:

1. **Platform defaults** — EduSphere brand, applied to all tenants as fallback
2. **Org/Tenant theme** — Custom colors, logo, fonts per tenant (stored in DB, loaded at runtime)
3. **User preference** — Dark mode, font size, reduced motion, reading mode (stored in user profile)

**Lessons from industry:**
- **Notion:** Uses CSS variables scoped to `[data-theme]` attribute with user-level overrides in localStorage
- **Linear:** Design token system with semantic tokens (not raw color values) — theme swaps at the semantic layer only
- **Webflow:** Tenant theme is a compiled CSS file delivered via CDN per workspace slug

EduSphere's approach: CSS custom properties injected into `<html style>` at tenant load time, with a three-tier token structure and Tailwind v4 `@theme` directives consuming the tokens.

---

### 2.1 Three-Tier Token Architecture

Based on the Brad Frost three-tier design token model:

```
Tier 1 (Primitive/Global) → Tier 2 (Semantic/Alias) → Tier 3 (Component)
```

```
Examples:
Tier 1: --primitive-blue-600: #0052cc
Tier 2: --semantic-color-interactive: var(--primitive-blue-600)
Tier 3: --button-primary-background: var(--semantic-color-interactive)
```

**Tenants override ONLY Tier 1 primitives.** Tier 2 and 3 cascade automatically. This means:
- A tenant changes `--primitive-brand-500` to their corporate blue
- All buttons, links, focus rings, and progress bars update automatically
- No risk of breaking the semantic system

#### TypeScript Token Schema

```typescript
// packages/themes/src/types.ts

/** Tier 1: Raw values. Tenants customize these. */
export interface PrimitiveTokens {
  // Brand palette (5 shades each)
  colorBrand50: string;
  colorBrand100: string;
  colorBrand200: string;
  colorBrand300: string;
  colorBrand400: string;
  colorBrand500: string;   // Primary brand color
  colorBrand600: string;   // Primary interactive
  colorBrand700: string;   // Primary hover
  colorBrand800: string;
  colorBrand900: string;

  // Neutral palette
  colorNeutral50: string;
  colorNeutral100: string;
  colorNeutral200: string;
  colorNeutral300: string;
  colorNeutral400: string;
  colorNeutral500: string;
  colorNeutral600: string;
  colorNeutral700: string;
  colorNeutral800: string;
  colorNeutral900: string;

  // Semantic status colors
  colorSuccess: string;
  colorWarning: string;
  colorError: string;
  colorInfo: string;

  // Typography
  fontFamilyBase: string;
  fontFamilyHeading: string;
  fontFamilyMono: string;

  // Border radius scale
  borderRadiusSm: string;   // e.g. '4px'
  borderRadiusMd: string;   // e.g. '8px'
  borderRadiusLg: string;   // e.g. '12px'
  borderRadiusXl: string;   // e.g. '16px'
  borderRadiusFull: string; // e.g. '9999px'

  // Shadows
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
}

/** Tier 2: Semantic mappings. Never customized directly by tenants. */
export interface SemanticTokens {
  // Text
  colorTextPrimary: string;
  colorTextSecondary: string;
  colorTextMuted: string;
  colorTextOnBrand: string;
  colorTextDestructive: string;
  colorTextSuccess: string;

  // Backgrounds
  colorBgPage: string;
  colorBgSurface: string;
  colorBgSubtle: string;
  colorBgBrand: string;
  colorBgBrandSubtle: string;

  // Borders
  colorBorderDefault: string;
  colorBorderStrong: string;
  colorBorderBrand: string;

  // Interactive
  colorInteractive: string;
  colorInteractiveHover: string;
  colorInteractiveActive: string;
  colorInteractiveFocus: string;
}

/** Tier 3: Component-specific. Rarely overridden, mostly consume Tier 2. */
export interface ComponentTokens {
  buttonPrimaryBg: string;
  buttonPrimaryText: string;
  buttonPrimaryHoverBg: string;
  buttonSecondaryBg: string;
  buttonSecondaryText: string;
  buttonSecondaryBorder: string;
  navBg: string;
  navText: string;
  cardBg: string;
  cardBorder: string;
  progressBarFill: string;
  badgeBg: string;
  badgeText: string;
}

/** Full tenant theme structure stored in DB */
export interface TenantTheme {
  tenantId: string;
  name: string;                              // e.g. "Acme Corp Theme"
  primitives: Partial<PrimitiveTokens>;      // Only overrides — platform defaults fill gaps
  logoUrl: string | null;
  faviconUrl: string | null;
  darkMode: 'system' | 'always-dark' | 'always-light' | 'disabled';
  customCss: string | null;                  // Escape hatch — sanitized
  updatedAt: Date;
}
```

---

### 2.2 CSS Custom Properties Structure

#### Platform Default Tokens (loaded globally)

```css
/* packages/themes/src/defaults.css */
/* Tier 1: Primitive tokens — EduSphere defaults */
:root {
  /* Brand palette */
  --primitive-brand-50:  #eff6ff;
  --primitive-brand-100: #dbeafe;
  --primitive-brand-200: #bfdbfe;
  --primitive-brand-300: #93c5fd;
  --primitive-brand-400: #60a5fa;
  --primitive-brand-500: #3b82f6;
  --primitive-brand-600: #2563eb;
  --primitive-brand-700: #1d4ed8;
  --primitive-brand-800: #1e40af;
  --primitive-brand-900: #1e3a8a;

  /* Neutral palette */
  --primitive-neutral-50:  #f9fafb;
  --primitive-neutral-100: #f3f4f6;
  --primitive-neutral-200: #e5e7eb;
  --primitive-neutral-300: #d1d5db;
  --primitive-neutral-400: #9ca3af;
  --primitive-neutral-500: #6b7280;
  --primitive-neutral-600: #4b5563;
  --primitive-neutral-700: #374151;
  --primitive-neutral-800: #1f2937;
  --primitive-neutral-900: #111827;

  /* Status */
  --primitive-success: #16a34a;
  --primitive-warning: #d97706;
  --primitive-error:   #dc2626;
  --primitive-info:    #0284c7;

  /* Typography */
  --primitive-font-base:    'Inter', system-ui, -apple-system, sans-serif;
  --primitive-font-heading: 'Inter', system-ui, sans-serif;
  --primitive-font-mono:    'JetBrains Mono', 'Fira Code', monospace;

  /* Border radius */
  --primitive-radius-sm:   4px;
  --primitive-radius-md:   8px;
  --primitive-radius-lg:   12px;
  --primitive-radius-xl:   16px;
  --primitive-radius-full: 9999px;

  /* Shadows */
  --primitive-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --primitive-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --primitive-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

/* Tier 2: Semantic tokens (light mode) */
:root,
[data-theme="light"] {
  --color-text-primary:     var(--primitive-neutral-900);
  --color-text-secondary:   var(--primitive-neutral-600);
  --color-text-muted:       var(--primitive-neutral-500);
  --color-text-on-brand:    #ffffff;
  --color-text-destructive: var(--primitive-error);

  --color-bg-page:          var(--primitive-neutral-50);
  --color-bg-surface:       #ffffff;
  --color-bg-subtle:        var(--primitive-neutral-100);
  --color-bg-brand:         var(--primitive-brand-600);
  --color-bg-brand-subtle:  var(--primitive-brand-50);

  --color-border-default:   var(--primitive-neutral-200);
  --color-border-strong:    var(--primitive-neutral-300);
  --color-border-brand:     var(--primitive-brand-600);

  --color-interactive:      var(--primitive-brand-600);
  --color-interactive-hover: var(--primitive-brand-700);
  --color-interactive-focus: var(--primitive-brand-600);

  --font-body:    var(--primitive-font-base);
  --font-heading: var(--primitive-font-heading);
  --font-mono:    var(--primitive-font-mono);

  --radius-sm:   var(--primitive-radius-sm);
  --radius-md:   var(--primitive-radius-md);
  --radius-lg:   var(--primitive-radius-lg);
  --radius-xl:   var(--primitive-radius-xl);
  --radius-full: var(--primitive-radius-full);

  --shadow-sm: var(--primitive-shadow-sm);
  --shadow-md: var(--primitive-shadow-md);
  --shadow-lg: var(--primitive-shadow-lg);
}

/* Dark mode semantic overrides */
[data-theme="dark"] {
  --color-text-primary:     var(--primitive-neutral-50);
  --color-text-secondary:   var(--primitive-neutral-400);
  --color-text-muted:       var(--primitive-neutral-500);

  --color-bg-page:          var(--primitive-neutral-900);
  --color-bg-surface:       var(--primitive-neutral-800);
  --color-bg-subtle:        var(--primitive-neutral-700);
  --color-bg-brand:         var(--primitive-brand-500);
  --color-bg-brand-subtle:  var(--primitive-neutral-800);

  --color-border-default:   var(--primitive-neutral-700);
  --color-border-strong:    var(--primitive-neutral-600);

  --color-interactive:      var(--primitive-brand-400);
  --color-interactive-hover: var(--primitive-brand-300);
  --color-interactive-focus: var(--primitive-brand-400);
}

/* Tier 3: Component tokens (consumed by shadcn/ui + custom components) */
:root {
  --button-primary-bg:     var(--color-bg-brand);
  --button-primary-text:   var(--color-text-on-brand);
  --button-primary-hover:  var(--color-interactive-hover);
  --button-secondary-bg:   var(--color-bg-surface);
  --button-secondary-text: var(--color-interactive);
  --button-secondary-border: var(--color-border-brand);

  --card-bg:     var(--color-bg-surface);
  --card-border: var(--color-border-default);
  --card-shadow: var(--shadow-sm);

  --nav-bg:       var(--color-bg-surface);
  --nav-text:     var(--color-text-primary);
  --nav-border:   var(--color-border-default);

  --progress-fill: var(--color-interactive);
  --progress-bg:   var(--color-bg-subtle);

  --badge-bg:   var(--color-bg-brand-subtle);
  --badge-text: var(--color-interactive);
}
```

---

### 2.3 Tailwind CSS v4 Integration

With Tailwind v4's `@theme` directive, platform tokens map directly to utility classes:

```css
/* apps/web/src/styles/tailwind.css */
@import "tailwindcss";

/* Map semantic CSS variables to Tailwind theme tokens */
@theme {
  /* Colors — these create bg-*, text-*, border-* utilities */
  --color-brand:              var(--color-interactive);
  --color-brand-hover:        var(--color-interactive-hover);
  --color-surface:            var(--color-bg-surface);
  --color-page:               var(--color-bg-page);
  --color-subtle:             var(--color-bg-subtle);
  --color-text:               var(--color-text-primary);
  --color-text-muted:         var(--color-text-secondary);
  --color-border:             var(--color-border-default);
  --color-border-strong:      var(--color-border-strong);

  /* Typography */
  --font-body:    var(--font-body);
  --font-heading: var(--font-heading);
  --font-mono:    var(--font-mono);

  /* Border radius */
  --radius-sm:   var(--radius-sm);
  --radius-md:   var(--radius-md);
  --radius-lg:   var(--radius-lg);
  --radius-xl:   var(--radius-xl);
  --radius-full: var(--radius-full);

  /* Shadows */
  --shadow-card: var(--shadow-sm);
  --shadow-modal: var(--shadow-lg);
}

/* Dark mode variant using data attribute (not .dark class) */
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

Usage in components:

```tsx
// Uses Tailwind utilities backed by CSS variables — automatically themed
<div className="bg-surface border border-border rounded-[--radius-md] shadow-card">
  <h2 className="text-text font-heading">Course Title</h2>
  <p className="text-text-muted font-body">Description</p>
  <button className="bg-brand hover:bg-brand-hover text-white rounded-[--radius-sm]">
    Enroll
  </button>
</div>
```

---

### 2.4 PostgreSQL Database Schema

```sql
-- Migration: 0010_tenant_themes.sql
-- Stored in packages/db/src/migrations/0010_tenant_themes.sql

-- Tenant theme configuration
CREATE TABLE IF NOT EXISTS tenant_themes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Theme metadata
  name            VARCHAR(100) NOT NULL DEFAULT 'Default Theme',
  is_active       BOOLEAN NOT NULL DEFAULT true,

  -- Tier 1 primitive overrides (JSON — only the values the tenant overrides)
  -- NULL means "use platform default"
  primitives      JSONB,

  -- Brand assets
  logo_url        TEXT,           -- Stored in MinIO, served via CDN
  logo_dark_url   TEXT,           -- Logo for dark mode (optional)
  favicon_url     TEXT,

  -- Dark mode behavior
  dark_mode       VARCHAR(20) NOT NULL DEFAULT 'system'
                  CHECK (dark_mode IN ('system', 'always-dark', 'always-light', 'disabled')),

  -- Escape hatch for custom CSS (sanitized via DOMPurify before storage)
  custom_css      TEXT,

  -- Audit
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_themes_active
  ON tenant_themes(tenant_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_themes_tenant_id
  ON tenant_themes(tenant_id);

-- User-level theme preference (overrides tenant theme)
-- Extends the existing user_preferences table
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS theme_mode         VARCHAR(20) DEFAULT 'system'
    CHECK (theme_mode IN ('system', 'light', 'dark')),
  ADD COLUMN IF NOT EXISTS font_size          VARCHAR(10) DEFAULT 'md'
    CHECK (font_size IN ('sm', 'md', 'lg', 'xl')),
  ADD COLUMN IF NOT EXISTS reading_mode       VARCHAR(20) DEFAULT 'default'
    CHECK (reading_mode IN ('default', 'dyslexic', 'narrow')),
  ADD COLUMN IF NOT EXISTS motion_preference  VARCHAR(10) DEFAULT 'auto'
    CHECK (motion_preference IN ('auto', 'reduce', 'full')),
  ADD COLUMN IF NOT EXISTS contrast_mode      VARCHAR(20) DEFAULT 'default'
    CHECK (contrast_mode IN ('default', 'high-contrast'));

-- RLS: tenant can only access their own themes
ALTER TABLE tenant_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_themes_isolation ON tenant_themes
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
```

#### Drizzle ORM Schema

```typescript
// packages/db/src/schema/themes.ts
import { pgTable, uuid, text, jsonb, boolean, timestamp, varchar, check } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const tenantThemes = pgTable('tenant_themes', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:        varchar('name', { length: 100 }).notNull().default('Default Theme'),
  isActive:    boolean('is_active').notNull().default(true),
  primitives:  jsonb('primitives').$type<Partial<PrimitiveTokens>>(),
  logoUrl:     text('logo_url'),
  logoDarkUrl: text('logo_dark_url'),
  faviconUrl:  text('favicon_url'),
  darkMode:    varchar('dark_mode', { length: 20 }).notNull().default('system'),
  customCss:   text('custom_css'),
  createdBy:   uuid('created_by').references(() => users.id),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TenantThemeRow = typeof tenantThemes.$inferSelect;
export type NewTenantTheme = typeof tenantThemes.$inferInsert;
```

---

### 2.5 React Context Theme Provider

#### Theme Context Types

```typescript
// apps/web/src/contexts/ThemeContext.tsx

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { TenantTheme, PrimitiveTokens } from '@edusphere/themes';
import { applyThemeToDocument, buildCssVariables } from '@/lib/theme-utils';

interface UserThemePreferences {
  mode: 'system' | 'light' | 'dark';
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  readingMode: 'default' | 'dyslexic' | 'narrow';
  motionPreference: 'auto' | 'reduce' | 'full';
  contrastMode: 'default' | 'high-contrast';
}

interface ThemeContextValue {
  // Current resolved theme
  tenantTheme: TenantTheme | null;
  userPreferences: UserThemePreferences;
  resolvedMode: 'light' | 'dark';          // The actual mode being rendered

  // Actions
  setUserPreference: <K extends keyof UserThemePreferences>(
    key: K,
    value: UserThemePreferences[K],
  ) => void;
  previewTheme: (primitives: Partial<PrimitiveTokens>) => void;
  cancelPreview: () => void;
  isPreviewMode: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

#### Theme Provider Implementation

```typescript
// apps/web/src/contexts/ThemeContext.tsx (continued)

interface ThemeProviderProps {
  tenantTheme: TenantTheme | null;
  initialUserPreferences: UserThemePreferences;
  children: React.ReactNode;
}

export function ThemeProvider({
  tenantTheme,
  initialUserPreferences,
  children,
}: ThemeProviderProps) {
  const [userPreferences, setUserPreferences] = useState(initialUserPreferences);
  const [previewPrimitives, setPreviewPrimitives] = useState<Partial<PrimitiveTokens> | null>(null);
  const [systemMode, setSystemMode] = useState<'light' | 'dark'>('light');

  // Detect system dark mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemMode(mq.matches ? 'dark' : 'light');
    const handler = (e: MediaQueryListEvent) =>
      setSystemMode(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Resolve effective dark/light mode
  const resolvedMode = (() => {
    const tenantDarkMode = tenantTheme?.darkMode ?? 'system';
    if (tenantDarkMode === 'always-dark') return 'dark';
    if (tenantDarkMode === 'always-light') return 'light';
    if (tenantDarkMode === 'disabled') return 'light'; // tenant disables dark mode

    // Tenant allows system/user choice
    if (userPreferences.mode === 'dark') return 'dark';
    if (userPreferences.mode === 'light') return 'light';
    return systemMode; // 'system' → follow OS
  })() as 'light' | 'dark';

  // Apply theme to DOM whenever resolved theme changes
  useEffect(() => {
    const effectivePrimitives = previewPrimitives ?? tenantTheme?.primitives ?? {};
    const cssVars = buildCssVariables(effectivePrimitives);

    // Inject CSS variables as inline style on <html>
    applyThemeToDocument(cssVars, resolvedMode, userPreferences);
  }, [tenantTheme, previewPrimitives, resolvedMode, userPreferences]);

  const setUserPreference = useCallback(
    <K extends keyof UserThemePreferences>(key: K, value: UserThemePreferences[K]) => {
      setUserPreferences((prev) => ({ ...prev, [key]: value }));
      // Persist to DB via GraphQL mutation (debounced)
      debouncedSavePreference(key, value);
    },
    [],
  );

  const previewTheme = useCallback((primitives: Partial<PrimitiveTokens>) => {
    setPreviewPrimitives(primitives);
  }, []);

  const cancelPreview = useCallback(() => {
    setPreviewPrimitives(null);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        tenantTheme,
        userPreferences,
        resolvedMode,
        setUserPreference,
        previewTheme,
        cancelPreview,
        isPreviewMode: previewPrimitives !== null,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
```

#### Theme Utility Functions

```typescript
// apps/web/src/lib/theme-utils.ts

import type { PrimitiveTokens, UserThemePreferences } from '@edusphere/themes';
import { PLATFORM_DEFAULTS } from '@edusphere/themes/defaults';

/**
 * Build a map of CSS variable name → value from primitive overrides.
 * Only includes variables that differ from platform defaults.
 */
export function buildCssVariables(
  overrides: Partial<PrimitiveTokens>,
): Record<string, string> {
  const merged = { ...PLATFORM_DEFAULTS, ...overrides };
  const vars: Record<string, string> = {};

  // Map camelCase token keys to CSS variable names
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined) {
      // colorBrand500 → --primitive-brand-500
      const cssKey = `--primitive-${camelToKebab(key)}`;
      vars[cssKey] = value as string;
    }
  }

  return vars;
}

/**
 * Apply CSS variables and theme attributes to the document root.
 * This is the single point that mutates the DOM for theming.
 */
export function applyThemeToDocument(
  cssVars: Record<string, string>,
  mode: 'light' | 'dark',
  prefs: UserThemePreferences,
): void {
  const root = document.documentElement;

  // Apply CSS variables as inline style (highest specificity, no class juggling)
  for (const [key, value] of Object.entries(cssVars)) {
    root.style.setProperty(key, value);
  }

  // Theme mode
  root.setAttribute('data-theme', mode);

  // Reading preferences
  root.setAttribute('data-reading-mode', prefs.readingMode);
  root.setAttribute('data-font-size', prefs.fontSize);
  root.setAttribute('data-contrast', prefs.contrastMode);

  // Motion preference
  if (prefs.motionPreference === 'reduce') {
    root.setAttribute('data-reduce-motion', 'true');
  } else if (prefs.motionPreference === 'full') {
    root.setAttribute('data-reduce-motion', 'false');
  } else {
    root.removeAttribute('data-reduce-motion');
  }
}

function camelToKebab(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

// Debounced save to avoid GraphQL mutation on every keystroke during color picker
let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function debouncedSavePreference(key: string, value: unknown): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    // Dispatch GraphQL mutation via urql
    // updateUserPreferences({ [key]: value })
    saveTimer = null;
  }, 800);
}
```

---

### 2.6 Real-Time Theme Preview

The Admin theme editor must show live preview without page reload.

```tsx
// apps/web/src/pages/admin/ThemeEditor.tsx

import { useState, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { PrimitiveTokens } from '@edusphere/themes';

// Color picker component (one per token)
function ColorToken({
  label,
  tokenKey,
  currentValue,
  onChange,
}: {
  label: string;
  tokenKey: keyof PrimitiveTokens;
  currentValue: string;
  onChange: (key: keyof PrimitiveTokens, value: string) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="text-sm font-medium w-48">{label}</span>
      <input
        type="color"
        value={currentValue}
        onChange={(e) => onChange(tokenKey, e.target.value)}
        className="h-8 w-16 rounded cursor-pointer border border-border"
        aria-label={`${label} color picker`}
      />
      <code className="text-xs text-text-muted">{currentValue}</code>
    </label>
  );
}

export function ThemeEditor() {
  const { tenantTheme, previewTheme, cancelPreview, isPreviewMode } = useTheme();
  const [draftPrimitives, setDraftPrimitives] = useState<Partial<PrimitiveTokens>>(
    tenantTheme?.primitives ?? {},
  );

  const handleColorChange = useCallback(
    (key: keyof PrimitiveTokens, value: string) => {
      const updated = { ...draftPrimitives, [key]: value };
      setDraftPrimitives(updated);
      // Instantly apply to DOM — no round-trip needed
      previewTheme(updated);
    },
    [draftPrimitives, previewTheme],
  );

  const handleSave = async () => {
    await saveTheme(draftPrimitives);
    cancelPreview(); // Now using the DB-persisted theme
  };

  const handleCancel = () => {
    setDraftPrimitives(tenantTheme?.primitives ?? {});
    cancelPreview();
  };

  return (
    <div className="grid grid-cols-[320px_1fr] gap-6">
      {/* Controls panel */}
      <aside className="bg-surface border border-border rounded-[--radius-lg] p-6">
        <h2 className="text-text font-heading font-semibold mb-4">Brand Colors</h2>

        <div className="space-y-3">
          <ColorToken
            label="Primary brand"
            tokenKey="colorBrand600"
            currentValue={draftPrimitives.colorBrand600 ?? '#2563eb'}
            onChange={handleColorChange}
          />
          <ColorToken
            label="Brand hover"
            tokenKey="colorBrand700"
            currentValue={draftPrimitives.colorBrand700 ?? '#1d4ed8'}
            onChange={handleColorChange}
          />
          {/* ... more tokens */}
        </div>

        {isPreviewMode && (
          <p role="status" className="text-sm text-[--primitive-warning] mt-4">
            Preview mode — changes not saved
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={handleSave} className="btn-primary">
            Save theme
          </button>
          <button type="button" onClick={handleCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </aside>

      {/* Live preview panel */}
      <div aria-label="Theme preview" className="border border-border rounded-[--radius-lg] overflow-hidden">
        {/* Embedded preview of key UI components */}
        <ThemePreviewPanel />
      </div>
    </div>
  );
}
```

---

### 2.7 Dark Mode Integration

#### System-Aware Detection Pattern

```tsx
// apps/web/src/components/ThemeToggle.tsx
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

const MODE_OPTIONS = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
] as const;

export function ThemeToggle() {
  const { userPreferences, setUserPreference, resolvedMode } = useTheme();

  return (
    <div role="group" aria-label="Color mode">
      {MODE_OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setUserPreference('mode', value)}
          aria-pressed={userPreferences.mode === value}
          className={[
            'flex items-center gap-2 px-3 py-1.5 rounded text-sm',
            userPreferences.mode === value
              ? 'bg-brand text-white'
              : 'text-text-muted hover:text-text',
          ].join(' ')}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
```

#### Loading Theme Server-Side (Avoiding Flash)

```tsx
// apps/web/index.html — inline script to prevent FOUC
<script>
  (function() {
    // Read tenant theme mode from localStorage (set on last visit)
    // Or detect system preference
    const stored = localStorage.getItem('edusphere-theme-mode');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const mode = stored === 'dark' ? 'dark'
                : stored === 'light' ? 'light'
                : systemDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', mode);
  })();
</script>
```

---

### 2.8 Industry Comparisons

| Platform | Theme Storage | Runtime Application | Tenant Override |
|----------|---------------|--------------------|-----------------|
| **Notion** | User preference in DB + localStorage | `[data-theme]` attribute on `<html>` | Workspace-level color palette |
| **Linear** | Workspace settings in DB | CSS variables on `:root` via inline style | Accent color + background only |
| **Webflow** | Workspace design system in DB | Compiled CSS file per workspace slug, served via CDN | Full CSS control within design system |
| **EduSphere** | Tenant primitives in PostgreSQL `jsonb` | CSS variables injected as `style` on `<html>` at runtime | Tier 1 primitives only (safe cascade) |

#### EduSphere Advantages Over Naive Approaches

- **No CSS compilation per tenant** (unlike old LESS/SASS approach) — CSS variables update instantly
- **No extra network requests** — variables are injected inline after tenant theme fetch
- **No flicker** — inline script on `<html>` applies `data-theme` before React hydrates
- **Tailwind v4 compatibility** — `@theme` directive consumes variables; Tailwind utility classes auto-adapt
- **Type-safe** — `PrimitiveTokens` TypeScript interface prevents invalid token keys

---

### Appendix: Tenant Theme GraphQL API

```graphql
# Relevant SDL additions for apps/subgraph-core/src/schema/theme.graphql

type TenantTheme {
  id: ID!
  tenantId: ID!
  name: String!
  primitives: JSON
  logoUrl: String
  logoDarkUrl: String
  faviconUrl: String
  darkMode: DarkModePolicy!
  updatedAt: DateTime!
}

enum DarkModePolicy {
  SYSTEM
  ALWAYS_DARK
  ALWAYS_LIGHT
  DISABLED
}

extend type Query {
  tenantTheme: TenantTheme @authenticated
}

extend type Mutation {
  updateTenantTheme(input: UpdateTenantThemeInput!): TenantTheme!
    @authenticated
    @requiresRole(roles: [ORG_ADMIN, SUPER_ADMIN])

  previewTenantTheme(primitives: JSON!): TenantTheme!
    @authenticated
    @requiresRole(roles: [ORG_ADMIN, SUPER_ADMIN])
}

input UpdateTenantThemeInput {
  name: String
  primitives: JSON
  logoUrl: String
  logoDarkUrl: String
  faviconUrl: String
  darkMode: DarkModePolicy
  customCss: String
}
```

---

*Document generated: March 2026 — EduSphere Session 24 UX Research*
*Sources: W3C WCAG 2.2 spec, Tailwind CSS v4 docs, Brad Frost Design Token Architecture, React Aria, Radix UI, Argos CI migration report*
