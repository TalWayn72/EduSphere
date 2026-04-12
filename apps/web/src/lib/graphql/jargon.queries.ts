import { gql } from 'urql';

// ── Queries ───────────────────────────────────────────────────────────────────

export const JARGON_DOMAINS_QUERY = gql`
  query JargonDomains($language: String) {
    jargonDomains(language: $language) {
      id
      tenantId
      name
      description
      language
      parentDomain {
        id
        name
      }
      termCount
      relatedDomains {
        domain {
          id
          name
        }
        score
      }
    }
  }
`;

export const JARGON_TERMS_QUERY = gql`
  query JargonTerms($domainId: ID!, $search: String, $limit: Int) {
    jargonTerms(domainId: $domainId, search: $search, limit: $limit) {
      id
      domainId
      canonicalForm
      phoneticHint
      altForms
      definitionShort
      language
      source
      confidence
    }
  }
`;

export const DETECT_LESSON_DOMAINS_QUERY = gql`
  query DetectLessonDomains($lessonId: ID!) {
    detectLessonDomains(lessonId: $lessonId) {
      domains {
        domain {
          id
          name
          description
        }
        confidence
        method
      }
      suggestedTerms {
        id
        canonicalForm
        definitionShort
      }
    }
  }
`;

export const LESSON_JARGON_OCCURRENCES_QUERY = gql`
  query LessonJargonOccurrences($lessonId: ID!) {
    lessonJargonOccurrences(lessonId: $lessonId) {
      id
      lessonId
      term {
        id
        canonicalForm
        definitionShort
      }
      startTime
      endTime
      originalText
      correctedText
    }
  }
`;

// ── Mutations ─────────────────────────────────────────────────────────────────

export const CREATE_JARGON_DOMAIN_MUTATION = gql`
  mutation CreateJargonDomain($input: CreateJargonDomainInput!) {
    createJargonDomain(input: $input) {
      id
      tenantId
      name
      description
      language
      parentDomain {
        id
        name
      }
      termCount
    }
  }
`;

export const UPDATE_JARGON_DOMAIN_MUTATION = gql`
  mutation UpdateJargonDomain($id: ID!, $input: UpdateJargonDomainInput!) {
    updateJargonDomain(id: $id, input: $input) {
      id
      name
      description
      language
    }
  }
`;

export const DELETE_JARGON_DOMAIN_MUTATION = gql`
  mutation DeleteJargonDomain($id: ID!) {
    deleteJargonDomain(id: $id)
  }
`;

export const ADD_JARGON_TERM_MUTATION = gql`
  mutation AddJargonTerm($input: AddJargonTermInput!) {
    addJargonTerm(input: $input) {
      id
      domainId
      canonicalForm
      phoneticHint
      altForms
      definitionShort
      language
      source
      confidence
    }
  }
`;

export const UPDATE_JARGON_TERM_MUTATION = gql`
  mutation UpdateJargonTerm($id: ID!, $input: UpdateJargonTermInput!) {
    updateJargonTerm(id: $id, input: $input) {
      id
      canonicalForm
      phoneticHint
      altForms
      definitionShort
      language
    }
  }
`;

export const DELETE_JARGON_TERM_MUTATION = gql`
  mutation DeleteJargonTerm($id: ID!) {
    deleteJargonTerm(id: $id)
  }
`;

export const CONFIRM_LESSON_DOMAINS_MUTATION = gql`
  mutation ConfirmLessonDomains($lessonId: ID!, $domainIds: [ID!]!) {
    confirmLessonDomains(lessonId: $lessonId, domainIds: $domainIds) {
      lessonId
      confirmedDomainIds
    }
  }
`;

export const IMPORT_JARGON_TERMS_MUTATION = gql`
  mutation ImportJargonTerms($domainId: ID!, $csvContent: String!) {
    importJargonTerms(domainId: $domainId, csvContent: $csvContent) {
      imported
      skipped
      errors
    }
  }
`;
