/**
 * AITutorScreen — barrel re-export for backward compatibility.
 * Implementation split into ./ai-tutor/ sub-modules.
 */
export { default } from './ai-tutor';
export { resolveSessionId } from './ai-tutor/ai-tutor.types';
export { checkAiConsent, grantAiConsent } from '../lib/ai-consent';
