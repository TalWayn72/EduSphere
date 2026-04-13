import { gql } from 'urql';

// ── Single entry ───────────────────────────────────────────────────────────────

export const GLOSSARY_ENTRY_QUERY = gql`
  query GlossaryEntry($termId: ID!) {
    jargonTerm(id: $termId) {
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

// ── Glossary wiki entry (extended — includes wikiContent + cross-refs) ─────────

export const GLOSSARY_WIKI_ENTRY_QUERY = gql`
  query GlossaryWikiEntry($termId: ID!) {
    jargonTermWiki(id: $termId) {
      id
      domainId
      canonicalForm
      phoneticHint
      altForms
      definitionShort
      wikiContent
      language
      source
      confidence
      lessonRefs {
        lessonId
        lessonTitle
        firstMentionTime
      }
      relatedTerms {
        id
        canonicalForm
        definitionShort
      }
    }
  }
`;

// ── List by domain ─────────────────────────────────────────────────────────────

export const GLOSSARY_ENTRIES_QUERY = gql`
  query GlossaryEntries($domainId: ID!, $limit: Int, $offset: Int) {
    jargonTerms(domainId: $domainId, limit: $limit) {
      id
      domainId
      canonicalForm
      definitionShort
      language
      confidence
    }
  }
`;

// ── Search ─────────────────────────────────────────────────────────────────────

export const GLOSSARY_SEARCH_QUERY = gql`
  query GlossarySearch($search: String!, $domainId: ID, $limit: Int) {
    jargonTerms(domainId: $domainId, search: $search, limit: $limit) {
      id
      domainId
      canonicalForm
      definitionShort
      language
      confidence
    }
  }
`;

// ── Mutations ──────────────────────────────────────────────────────────────────

export const UPDATE_GLOSSARY_WIKI_MUTATION = gql`
  mutation UpdateGlossaryWiki($termId: ID!, $wikiContent: String!) {
    updateJargonTermWiki(termId: $termId, wikiContent: $wikiContent) {
      id
      wikiContent
    }
  }
`;
