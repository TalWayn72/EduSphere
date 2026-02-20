import { gql } from 'urql';

export const CONCEPT_QUERY = gql`
  query Concept($id: ID!) {
    concept(id: $id) {
      id
      name
      definition
      sourceIds
      createdAt
    }
  }
`;

/**
 * Fetch a flat list of concepts for graph visualisation.
 * Maps to: concepts(limit: Int): [Concept!]!
 */
export const GET_CONCEPTS_QUERY = gql`
  query GetConcepts($limit: Int) {
    concepts(limit: $limit) {
      id
      name
      definition
      sourceIds
    }
  }
`;

/**
 * Fetch related concepts for a given concept node.
 * Maps to: relatedConcepts(conceptId: ID!, depth: Int, limit: Int): [RelatedConcept!]!
 */
export const GET_RELATED_CONCEPTS_QUERY = gql`
  query GetRelatedConcepts($conceptId: ID!, $depth: Int, $limit: Int) {
    relatedConcepts(conceptId: $conceptId, depth: $depth, limit: $limit) {
      concept {
        id
        name
        definition
      }
      strength
    }
  }
`;

/**
 * @deprecated conceptsForContent does not exist in the real schema.
 * Kept for reference only.
 */
export const CONCEPT_GRAPH_QUERY = gql`
  query ConceptGraph($contentId: ID!) {
    conceptsForContent(contentId: $contentId) {
      nodes {
        id
        label
        type
        description
      }
      edges {
        from
        to
        type
        strength
      }
    }
  }
`;

export const CREATE_CONCEPT_MUTATION = gql`
  mutation CreateConcept($input: CreateConceptInput!) {
    createConcept(input: $input) {
      id
      name
      definition
    }
  }
`;

export const LINK_CONCEPTS_MUTATION = gql`
  mutation LinkConcepts(
    $fromId: ID!
    $toId: ID!
    $relationshipType: String!
    $strength: Float
  ) {
    linkConcepts(
      fromId: $fromId
      toId: $toId
      relationshipType: $relationshipType
      strength: $strength
    ) {
      fromConcept {
        id
        name
      }
      toConcept {
        id
        name
      }
      relationshipType
      strength
    }
  }
`;

export const SEARCH_SEMANTIC_QUERY = gql`
  query SearchSemantic($query: String!, $limit: Int) {
    searchSemantic(query: $query, limit: $limit) {
      id
      text
      similarity
      entityType
      entityId
    }
  }
`;

/**
 * Find the shortest learning path between two concepts by name.
 * Maps to: learningPath(from: String!, to: String!): LearningPath
 * Returns null when no path exists.
 */
export const LEARNING_PATH_QUERY = gql`
  query LearningPath($from: String!, $to: String!) {
    learningPath(from: $from, to: $to) {
      concepts {
        id
        name
        type
      }
      steps
    }
  }
`;

/**
 * Collect distinct concepts reachable from a named concept via RELATED_TO edges.
 * Maps to: relatedConceptsByName(conceptName: String!, depth: Int): [ConceptNode!]!
 */
export const RELATED_CONCEPTS_BY_NAME_QUERY = gql`
  query RelatedConceptsByName($conceptName: String!, $depth: Int) {
    relatedConceptsByName(conceptName: $conceptName, depth: $depth) {
      id
      name
      type
    }
  }
`;

/**
 * Find the deepest prerequisite chain leading into a named concept.
 * Maps to: prerequisiteChain(conceptName: String!): [ConceptNode!]!
 */
export const PREREQUISITE_CHAIN_QUERY = gql`
  query PrerequisiteChain($conceptName: String!) {
    prerequisiteChain(conceptName: $conceptName) {
      id
      name
    }
  }
`;
