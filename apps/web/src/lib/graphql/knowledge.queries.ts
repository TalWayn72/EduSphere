import { gql } from 'urql';

export const CONCEPT_QUERY = gql`
  query Concept($id: ID!) {
    concept(id: $id) {
      id
      name
      definition
      relatedConcepts(maxDepth: 2) {
        id
        name
        relationshipType
        depth
      }
      createdAt
    }
  }
`;

export const RELATED_CONCEPTS_QUERY = gql`
  query RelatedConcepts($conceptId: ID!, $maxDepth: Int) {
    relatedConcepts(conceptId: $conceptId, maxDepth: $maxDepth) {
      id
      name
      definition
      relationshipType
      strength
      depth
    }
  }
`;

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
      success
    }
  }
`;
