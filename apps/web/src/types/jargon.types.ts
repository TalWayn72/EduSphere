// ── Domain types ──────────────────────────────────────────────────────────────

export interface JargonDomainRef {
  id: string;
  name: string;
}

export interface RelatedDomainEntry {
  domain: JargonDomainRef;
  score: number;
}

export interface JargonDomain {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  language: string;
  parentDomain: JargonDomainRef | null;
  termCount: number;
  relatedDomains: RelatedDomainEntry[];
}

// ── Term types ────────────────────────────────────────────────────────────────

export interface JargonTerm {
  id: string;
  domainId: string;
  canonicalForm: string;
  phoneticHint: string | null;
  altForms: string[];
  definitionShort: string;
  language: string;
  source: string | null;
  confidence: number;
}

// ── Detection types ───────────────────────────────────────────────────────────

export interface DetectedDomainEntry {
  domain: {
    id: string;
    name: string;
    description: string;
  };
  confidence: number;
  method: string;
}

export interface DetectLessonDomainsResult {
  domains: DetectedDomainEntry[];
  suggestedTerms: Array<{
    id: string;
    canonicalForm: string;
    definitionShort: string;
  }>;
}

// ── Occurrence types ──────────────────────────────────────────────────────────

export interface JargonOccurrence {
  id: string;
  lessonId: string;
  term: {
    id: string;
    canonicalForm: string;
    definitionShort: string;
  };
  startTime: number | null;
  endTime: number | null;
  originalText: string;
  correctedText: string | null;
}

// ── Mutation input types ──────────────────────────────────────────────────────

export interface CreateJargonDomainInput {
  name: string;
  description: string;
  language: string;
  parentDomainId?: string;
}

export interface UpdateJargonDomainInput {
  name?: string;
  description?: string;
  language?: string;
}

export interface AddJargonTermInput {
  domainId: string;
  canonicalForm: string;
  phoneticHint?: string;
  altForms?: string[];
  definitionShort: string;
  language: string;
  source?: string;
}

export interface UpdateJargonTermInput {
  canonicalForm?: string;
  phoneticHint?: string;
  altForms?: string[];
  definitionShort?: string;
  language?: string;
}

export interface ConfirmLessonDomainsResult {
  lessonId: string;
  confirmedDomainIds: string[];
}

export interface ImportJargonTermsResult {
  imported: number;
  skipped: number;
  errors: string[];
}
