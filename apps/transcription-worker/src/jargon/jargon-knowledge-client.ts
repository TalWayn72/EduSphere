/**
 * JargonKnowledgeClient
 *
 * HTTP client for querying the knowledge subgraph GraphQL API.
 * Used by JargonPostProcessorService to detect domains and load terms.
 */

const KNOWLEDGE_GRAPHQL_URL =
  process.env['KNOWLEDGE_SUBGRAPH_URL'] ?? 'http://localhost:4006/graphql';

const DETECT_DOMAINS_QUERY = `
  query DetectLessonDomains($lessonId: ID!) {
    detectLessonDomains(lessonId: $lessonId) {
      domains {
        domain { id name language }
        confidence
        method
      }
      suggestedTerms {
        id canonicalForm altForms domainId source confidence
      }
    }
  }
`;

const LIST_TERMS_QUERY = `
  query JargonTerms($domainId: ID!, $limit: Int) {
    jargonTerms(domainId: $domainId, limit: $limit) {
      id canonicalForm altForms
    }
  }
`;

export interface DetectedDomainPayload {
  domain: { id: string; name: string; language: string };
  confidence: number;
  method: string;
}

export interface SuggestedTermPayload {
  id: string;
  canonicalForm: string;
  domainId: string;
}

export interface TermPayload {
  id: string;
  canonicalForm: string;
  altForms: string[];
}

function headers(tenantId: string) {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
    Authorization: `Bearer ${process.env['INTERNAL_SERVICE_TOKEN'] ?? ''}`,
  };
}

export async function detectLessonDomains(
  lessonId: string,
  tenantId: string
): Promise<{
  domains: DetectedDomainPayload[];
  suggestedTerms: SuggestedTermPayload[];
}> {
  try {
    const resp = await fetch(KNOWLEDGE_GRAPHQL_URL, {
      method: 'POST',
      headers: headers(tenantId),
      body: JSON.stringify({
        query: DETECT_DOMAINS_QUERY,
        variables: { lessonId },
      }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = (await resp.json()) as {
      data?: {
        detectLessonDomains?: {
          domains: DetectedDomainPayload[];
          suggestedTerms: SuggestedTermPayload[];
        };
      };
    };
    return (
      json.data?.detectLessonDomains ?? { domains: [], suggestedTerms: [] }
    );
  } catch {
    return { domains: [], suggestedTerms: [] };
  }
}

export async function loadTermsForDomain(
  domainId: string,
  tenantId: string,
  limit = 50
): Promise<TermPayload[]> {
  try {
    const resp = await fetch(KNOWLEDGE_GRAPHQL_URL, {
      method: 'POST',
      headers: headers(tenantId),
      body: JSON.stringify({
        query: LIST_TERMS_QUERY,
        variables: { domainId, limit },
      }),
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      data?: { jargonTerms?: TermPayload[] };
    };
    return json.data?.jargonTerms ?? [];
  } catch {
    return [];
  }
}
