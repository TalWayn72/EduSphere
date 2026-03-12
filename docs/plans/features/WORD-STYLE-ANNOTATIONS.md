# MS-Word Style Annotation/Comment System — Implementation Plan

**Status:** ✅ Complete — implemented in Phase 45

---

## Context

The `/document/:contentId` route currently renders `RichDocumentPage` — a simple single-column read-only Tiptap viewer with no annotation UI. Users need a rich MS-Word-like experience to annotate documents: select text → write a comment → comment permanently linked to that text region. This plan builds a 3-panel resizable layout with bidirectional navigation between highlighted text and comment cards, using the existing GraphQL annotation infrastructure (`spatialData: JSON` field).

**Trigger:** User requirement for advanced document annotation UX.
**Expected outcome:** Replacing `RichDocumentPage` with `DocumentAnnotationPage` — a full-screen, resizable 3-panel interface that supports text-range annotation, layer filtering, and bidirectional comment↔document navigation.

---

## Architecture Overview

```
DocumentAnnotationPage (full-screen, no Layout shell)
└── ResizablePanelGroup (horizontal)
    ├── ResizablePanel [document, defaultSize=65, minSize=40]
    │   ├── DocumentToolbar (zoom: 75%/100%/125%/150%, layer toggles)
    │   └── ScrollArea
    │       └── AnnotatedDocumentViewer
    │           ├── EditorContent (Tiptap, editable:false)
    │           │   [ProseMirror DecorationSet plugin → colored inline spans]
    │           └── SelectionCommentButton (floating, absolute)
    │               └── CommentForm (Radix Popover)
    ├── ResizableHandle (with drag grip icon)
    └── ResizablePanel [comments, defaultSize=35, minSize=20]
        └── WordCommentPanel
            ├── LayerFilterBar + "Add Comment" button
            └── ScrollArea → CommentCard[] (sorted by spatialData.from)
```

---

## New Dependency

```bash
pnpm --filter @edusphere/web add react-resizable-panels
```

ESM-only, compatible with Vite 6 + pnpm workspaces. No additional Vite config needed.

---

## Data Flow: Selection → Mutation → Decoration

```
1. User selects text in document
   → onSelectionUpdate fires: editor.state.selection { from, to }
   → setPendingSelection({ from, to }) stored in local state
   → SelectionCommentButton appears near selection end (coordsAtPos)

2. User clicks "Add Comment" → CommentForm popover opens
   → User types text, picks layer → clicks Save
   → addTextAnnotation(text, layer, { from, to })
   → CREATE_ANNOTATION_MUTATION with spatialData: { from, to }

3. GraphQL returns new annotation with id + spatialData
   → useDocumentAnnotations filters textAnnotations[] (has spatialData.from/to)
   → passes to AnnotatedDocumentViewer via props

4. AnnotatedDocumentViewer useEffect triggers
   → dispatches transaction: tr.setMeta(annotationPluginKey, true)
   → Plugin rebuilds DecorationSet:
     Decoration.inline(from, to, { class: "annotation-highlight--[LAYER]",
                                   data-annotation-id: id })
   → EditorView re-renders with colored spans

5. BIDIRECTIONAL NAVIGATION:
   Click highlighted span → data-annotation-id → setFocusedAnnotationId(id)
     → WordCommentPanel scrolls CommentCard[id] into view
   Click CommentCard → setFocusedAnnotationId(id)
     → Plugin re-builds with "annotation-highlight--focused" class on that span
     → editor.commands.scrollIntoView() at from position
```

---

## Files

### New Files (9 files)

| File                                                                | Lines | Purpose                                                                                    |
| ------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------ |
| `apps/web/src/components/ui/resizable.tsx`                          | ~70   | shadcn/ui ResizablePanel wrapper (excluded from coverage per `src/components/ui/**` rule)  |
| `apps/web/src/components/annotation/AnnotationDecorationsPlugin.ts` | ~120  | ProseMirror `Plugin` with `DecorationSet` — inline colored spans for annotated ranges      |
| `apps/web/src/components/annotation/AnnotatedDocumentViewer.tsx`    | ~130  | Tiptap viewer with decoration plugin, onSelectionUpdate, onClick for annotation highlights |
| `apps/web/src/components/annotation/SelectionCommentButton.tsx`     | ~80   | Floating "Add Comment" button on text selection; positioned via `coordsAtPos`              |
| `apps/web/src/components/annotation/CommentForm.tsx`                | ~100  | Radix Popover form: Textarea + layer Select + Save/Cancel                                  |
| `apps/web/src/components/annotation/CommentCard.tsx`                | ~120  | MS-Word-style comment card: author, date, layer badge, text, reply thread, focus ring      |
| `apps/web/src/components/annotation/WordCommentPanel.tsx`           | ~140  | Right panel: layer filter bar, comment list sorted by `from` position, scroll-to on focus  |
| `apps/web/src/hooks/useDocumentAnnotations.ts`                      | ~130  | Fetches via `useAnnotations`, filters text-range annotations, exposes `addTextAnnotation`  |
| `apps/web/src/pages/DocumentAnnotationPage.tsx`                     | ~140  | 3-panel assembly: ResizablePanelGroup + toolbar + child components                         |

### Modified Files (5 files)

| File                                                   | Change                                                                                                                                                         |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/store.ts`                            | Add `focusedAnnotationId`, `setFocusedAnnotationId`, `documentZoom` (0.75\|1\|1.25\|1.5), `setDocumentZoom`, `annotationPanelWidth`, `setAnnotationPanelWidth` |
| `apps/web/src/types/annotations.ts`                    | Add `interface TextRange { from: number; to: number }` and `textRange?: TextRange` on `Annotation`                                                             |
| `apps/web/src/components/editor/RichContentViewer.tsx` | Add optional `extensions?: Extension[]` prop and `onSelectionUpdate?: (editor: Editor) => void` callback to `useEditor`                                        |
| `apps/web/src/lib/router.tsx`                          | Replace `RichDocumentPage` import with `DocumentAnnotationPage` lazy import on `/document/:contentId`                                                          |
| `apps/web/vitest.config.ts`                            | Add `react-resizable-panels` → stub alias if jsdom cannot resolve; add `@tiptap/pm/state` + `@tiptap/pm/view` → tiptapStub aliases                             |

### New Test Files (8 files)

| File                                                                      | Tests                                                                                                                                                          |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/annotation/__tests__/AnnotationDecorationsPlugin.test.ts` | Empty → empty DecorationSet; 2 annotations → 2 decorations at correct positions; focused annotation gets extra class; invalid/OOB range is clamped and skipped |
| `src/components/annotation/__tests__/CommentCard.test.tsx`                | Renders author, date, layer badge, text; click fires `onFocus(id)`; focused state shows ring; reply count shown                                                |
| `src/components/annotation/__tests__/WordCommentPanel.test.tsx`           | All 4 layer filter buttons render; filter works; "Add Comment" disabled when `selectionActive=false`; scroll-to on `focusedAnnotationId` change                |
| `src/components/annotation/__tests__/SelectionCommentButton.test.tsx`     | Not rendered when selection null; visible when selection non-null; click calls `onAddComment`                                                                  |
| `src/components/annotation/__tests__/CommentForm.test.tsx`                | Submit disabled when empty; Submit calls `onSubmit(text, layer)`; Cancel calls `onCancel`                                                                      |
| `src/hooks/useDocumentAnnotations.test.ts`                                | Filters only text-range annotations; sorts by `from`; `addTextAnnotation` calls mutation with `spatialData`                                                    |
| `src/hooks/useDocumentAnnotations.memory.test.ts`                         | Unmount does not throw; subscription paused on non-UUID; no double subscription                                                                                |
| `src/pages/DocumentAnnotationPage.test.tsx`                               | Renders ResizablePanelGroup; passes contentId to children (shallow mocks)                                                                                      |

---

## Agent Workstreams

### Phase 1 — Foundation (4 agents in PARALLEL)

| Agent                       | Files                                                    | Notes                                                                                   |
| --------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Agent-1 (Types + Store)     | `store.ts`, `types/annotations.ts`                       | No deps on other agents                                                                 |
| Agent-2 (ResizablePanel UI) | `components/ui/resizable.tsx`, `vitest.config.ts` update | Install dep first                                                                       |
| Agent-3 (Decoration Plugin) | `AnnotationDecorationsPlugin.ts` + its test              | Pure ProseMirror state logic; uses `@tiptap/pm/state` + `@tiptap/pm/view` real packages |
| Agent-4 (Data Hook)         | `useDocumentAnnotations.ts` + unit + memory tests        | Delegates to existing `useAnnotations`, adds spatialData filtering                      |

### Phase 2 — UI Components (3 agents in PARALLEL, after Phase 1)

| Agent                     | Files                                                         | Depends on              |
| ------------------------- | ------------------------------------------------------------- | ----------------------- |
| Agent-5 (CommentCard)     | `CommentCard.tsx` + test                                      | Phase 1 Agent-1 (types) |
| Agent-6 (Forms + Button)  | `CommentForm.tsx`, `SelectionCommentButton.tsx` + tests       | Phase 1 Agent-1 (types) |
| Agent-7 (AnnotatedViewer) | `AnnotatedDocumentViewer.tsx`, modify `RichContentViewer.tsx` | Phase 1 Agents 1+3      |

### Phase 3 — Assembly (SEQUENTIAL, after Phase 2)

| Step                    | Files                                                        |
| ----------------------- | ------------------------------------------------------------ |
| Agent-8 (Comment Panel) | `WordCommentPanel.tsx` + test (depends on CommentCard)       |
| Agent-9 (Page)          | `DocumentAnnotationPage.tsx` + test (depends on all Phase 2) |

### Phase 4 — Integration (2 agents in PARALLEL, after Phase 3)

| Agent             | Files                                                             |
| ----------------- | ----------------------------------------------------------------- |
| Agent-10 (Router) | `router.tsx` — swap `RichDocumentPage` → `DocumentAnnotationPage` |
| Agent-11 (CSS)    | `editor.css` — add annotation highlight CSS classes               |

---

## Key Implementation Details

### AnnotationDecorationsPlugin.ts

Use `Extension.create({ addProseMirrorPlugins() { return [plugin] } })` pattern (Tiptap v3 compliant). Plugin state holds `DecorationSet`. Re-build triggered by `tr.setMeta(annotationPluginKey, true)` dispatched from `AnnotatedDocumentViewer` via `useEffect` when annotations or `focusedAnnotationId` change. Clamp all `from`/`to` to `[0, doc.content.size]` before creating decorations; skip if `from >= to`.

### CSS Classes (add to editor.css)

```css
.annotation-highlight {
  border-radius: 2px;
  cursor: pointer;
  transition: background 150ms;
}
.annotation-highlight--PERSONAL {
  background: rgba(124, 58, 237, 0.15);
}
.annotation-highlight--SHARED {
  background: rgba(37, 99, 235, 0.15);
}
.annotation-highlight--INSTRUCTOR {
  background: rgba(22, 163, 74, 0.15);
}
.annotation-highlight--AI_GENERATED {
  background: rgba(217, 119, 6, 0.15);
}
.annotation-highlight--focused {
  background: rgba(245, 158, 11, 0.35);
  outline: 2px solid rgba(245, 158, 11, 0.6);
}
```

### spatialData Storage

No backend schema changes needed — `spatialData: JSON` column already exists in the annotation GraphQL type and database. Store `{ from: number, to: number }` (ProseMirror integer positions). The existing `normaliseAnnotation` helper in `useAnnotations.ts` needs one additive change: populate `textRange` from `spatialData.from/to` when both are present.

### DocumentZoom + Panel Width Persistence

Extend Zustand store with `persist` middleware using `partialize` to save only `documentZoom` and `annotationPanelWidth` to localStorage. Ephemeral state (`focusedAnnotationId`) is NOT persisted.

### RichContentViewer.tsx Minimal Change

Add two optional props only. Zero breaking changes — all existing callers continue to work without modification:

```typescript
export interface RichContentViewerProps {
  content: string;
  extensions?: Extension[]; // merged into useEditor extensions[]
  onSelectionUpdate?: (editor: Editor) => void; // passed to useEditor callback
}
```

### Vitest Config

- Add `@tiptap/pm/state` and `@tiptap/pm/view` to tiptapStub aliases (required for `AnnotationDecorationsPlugin.test.ts`)
- Add `react-resizable-panels` → tiptapStub alias for jsdom test environment only
- `AnnotationDecorationsPlugin.test.ts` should test pure plugin state logic without DOM/Tiptap integration

---

## Risks & Mitigations

| Risk                                                              | Mitigation                                                                                                                 |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ProseMirror positions become stale if document content changes    | Document is read-only (`editable: false`) — positions cannot change after load                                             |
| `coordsAtPos` returns viewport coordinates, not document-relative | Subtract `scrollContainer.getBoundingClientRect()` from result; re-compute on every `onSelectionUpdate`                    |
| Overlapping annotations (multiple on same text)                   | Sort by layer priority (INSTRUCTOR > SHARED > PERSONAL > AI); use highest-priority `data-annotation-id` for click handling |
| Tiptap v3 `@tiptap/pm/*` may not be in vitest aliases             | Add both `@tiptap/pm/state` and `@tiptap/pm/view` to vitest aliases pointing to tiptapStub                                 |
| `react-resizable-panels` ESM in jsdom                             | Alias to tiptapStub in vitest config only (not in vite.config.ts)                                                          |

---

## Verification (end-to-end)

1. **Install**: `pnpm --filter @edusphere/web add react-resizable-panels`
2. **Unit tests**: `pnpm --filter @edusphere/web test` — all 8 new test files pass, coverage ≥ 80%
3. **TypeScript**: `pnpm turbo typecheck` — zero errors
4. **Lint**: `mcp__eslint__lint-files` on each new file after writing
5. **Manual smoke test**:
   - Navigate to `/document/doc-1` — 3-panel layout renders
   - Drag the ResizableHandle — panels resize correctly
   - Select text → "Add Comment" button appears → fill form → Save
   - Highlight appears on selected text with correct layer color
   - Comment card appears in right panel with author/date/text
   - Click comment card → document scrolls to highlight, brings it to top
   - Click highlight → comment card scrolls to top of panel
   - Zoom selector changes document scale (75%→150%)
6. **TypeScript diagnostics**: `mcp__typescript-diagnostics__get_file_diagnostics` on modified files
