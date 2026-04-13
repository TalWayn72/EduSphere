import { gql } from 'urql';

// ── Single jargon term ─────────────────────────────────────────────────────────

export const GLOSSARY_ENTRY_QUERY = gql`
  query GlossaryEntry($termId: ID!) {
    jargonTerm(id: $termId) {
      id
      domainId
      canonicalForm
      phoneticHint
      altForms
      definitionShort
      definitionFull
      language
      source
      confidence
    }
  }
`;

// ── Glossary wiki entry (includes wikiContent + lesson refs) ───────────────────

export const GLOSSARY_WIKI_ENTRY_QUERY = gql`
  query GlossaryWikiEntry($termId: ID!) {
    glossaryEntry(termId: $termId) {
      id
      wikiContent
      aggregatedDefinition
      isPublished
      term {
        id
        canonicalForm
        phoneticHint
        altForms
        definitionShort
        language
        source
        confidence
      }
      lessonRefs {
        lessonId
        lessonTitle
        firstMentionTime
      }
      crossReferences {
        id
        canonicalForm
        definitionShort
      }
    }
  }
`;

// ── List by domain ─────────────────────────────────────────────────────────────

export const GLOSSARY_ENTRIES_QUERY = gql`
  query GlossaryEntries($domainId: ID!, $limit: Int) {
    glossaryEntries(domainId: $domainId, limit: $limit) {
      id
      isPublished
      term {
        id
        canonicalForm
        definitionShort
        language
        confidence
      }
    }
  }
`;

// ── Search ─────────────────────────────────────────────────────────────────────

export const GLOSSARY_SEARCH_QUERY = gql`
  query GlossarySearch($query: String!, $limit: Int) {
    glossarySearch(query: $query, limit: $limit) {
      id
      isPublished
      term {
        id
        canonicalForm
        definitionShort
        language
        confidence
      }
    }
  }
`;

// ── Mutations ──────────────────────────────────────────────────────────────────

export const UPDATE_GLOSSARY_WIKI_MUTATION = gql`
  mutation UpdateGlossaryWiki($termId: ID!, $wikiContent: String!) {
    updateGlossaryWiki(termId: $termId, wikiContent: $wikiContent) {
      id
      wikiContent
    }
  }
`;
