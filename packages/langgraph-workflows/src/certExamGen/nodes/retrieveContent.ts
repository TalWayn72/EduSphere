/**
 * Node 1: retrieveContent — fetches module content via HybridRAG search.
 */
import type { CertExamGenState } from '../state';
import type { CitationSearchFn } from '../types';

const MAX_SEARCH_RESULTS = 20;

export function retrieveContentNode(searchFn?: CitationSearchFn) {
  return async (
    state: CertExamGenState
  ): Promise<Partial<CertExamGenState>> => {
    if (!searchFn) {
      return {
        courseContent: `Module ${state.moduleId} content (no search fn provided)`,
        knowledgeGraphConcepts: [],
      };
    }

    try {
      const results = await searchFn(state.moduleId, MAX_SEARCH_RESULTS);
      const contentParts = results.map((r) => r.text);
      const concepts = results
        .filter((r) => r.source === 'Concept' || r.source === 'TopicCluster')
        .map((r) => r.text);

      return {
        courseContent: contentParts.join('\n\n'),
        knowledgeGraphConcepts: concepts,
      };
    } catch {
      return {
        courseContent: '',
        knowledgeGraphConcepts: [],
        errors: [
          ...state.errors,
          'Content retrieval failed — proceeding with empty context',
        ],
      };
    }
  };
}
