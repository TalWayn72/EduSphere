import { gql } from 'urql';

export const SAVED_SEARCHES_QUERY = gql`
  query SavedSearches {
    savedSearches {
      id
      name
      query
      filters
      createdAt
    }
  }
`;

export const CREATE_SAVED_SEARCH_MUTATION = gql`
  mutation CreateSavedSearch($input: CreateSavedSearchInput!) {
    createSavedSearch(input: $input) {
      id
      name
      query
      filters
      createdAt
    }
  }
`;

export const DELETE_SAVED_SEARCH_MUTATION = gql`
  mutation DeleteSavedSearch($id: ID!) {
    deleteSavedSearch(id: $id)
  }
`;
