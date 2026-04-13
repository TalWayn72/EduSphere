/**
 * citation-wizard-constants — types and preset data for CitationFormatWizard.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type CitationPreset =
  | 'JEWISH_TEXTS'
  | 'APA'
  | 'MLA'
  | 'CHICAGO'
  | 'CUSTOM';

export interface PresetOption {
  value: CitationPreset;
  label: string;
  description: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const PRESET_OPTIONS: PresetOption[] = [
  {
    value: 'JEWISH_TEXTS',
    label: 'Jewish Texts',
    description: 'Talmud, Mishnah, Midrash — tractate, daf, amud references',
  },
  {
    value: 'APA',
    label: 'APA',
    description:
      'Author-date format (Smith, 2020) — psychology & social sciences',
  },
  {
    value: 'MLA',
    label: 'MLA',
    description: 'Author-page format (Smith 42) — humanities and literature',
  },
  {
    value: 'CHICAGO',
    label: 'Chicago',
    description: 'Footnote or author-date — history, arts, social sciences',
  },
  {
    value: 'CUSTOM',
    label: 'Custom',
    description: 'Describe your own citation format in free text',
  },
];
