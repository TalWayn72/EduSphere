export interface TranslationCompletedEvent {
  assetId: string;
  transcriptId: string;
  language: string;
  vttKey: string;
  tenantId: string;
}
