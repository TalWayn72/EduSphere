/**
 * Re-export from content-viewer/ folder for backward compatibility.
 * The original 637-line monolith has been split into:
 *   - content-viewer/ContentViewer.tsx (orchestrator)
 *   - content-viewer/VideoSection.tsx (video + transcript)
 *   - content-viewer/AnnotationsPanel.tsx (annotations + knowledge graph)
 *   - content-viewer/AiChatPanel.tsx (AI Chavruta chat)
 *   - content-viewer/ContentViewerHelpers.tsx (skeleton, error banner)
 */
export { ContentViewer } from './content-viewer';
