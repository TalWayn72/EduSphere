import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import {
  SAVED_SEARCHES_QUERY,
  CREATE_SAVED_SEARCH_MUTATION,
  DELETE_SAVED_SEARCH_MUTATION,
} from '@/lib/graphql/search.queries';
import type { SavedSearch } from './search.types';

export function useSavedSearches(query: string) {
  const [, setSearchParams] = useSearchParams();

  // Mounted guard
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data: savedSearchesData }, refetchSavedSearches] = useQuery({
    query: SAVED_SEARCHES_QUERY,
    pause: !mounted,
    requestPolicy: 'network-only',
  });

  const [, createSavedSearchMutation] = useMutation(
    CREATE_SAVED_SEARCH_MUTATION
  );
  const [, deleteSavedSearchMutation] = useMutation(
    DELETE_SAVED_SEARCH_MUTATION
  );

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState('');
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSavedPanel, setShowSavedPanel] = useState(false);

  const savedSearches: SavedSearch[] =
    (savedSearchesData as { savedSearches?: SavedSearch[] })?.savedSearches ??
    [];

  const handleSaveSearch = async () => {
    if (!savedSearchName.trim() || !query.trim()) return;
    setSavingSearch(true);
    setSaveError(null);
    try {
      await createSavedSearchMutation({
        input: { name: savedSearchName.trim(), query },
      });
      setSavedSearchName('');
      setShowSaveModal(false);
      refetchSavedSearches({ requestPolicy: 'network-only' });
    } catch (err) {
      console.error('[Search] Failed to save search:', err);
      setSaveError('Failed to save search. Please try again.');
    } finally {
      setSavingSearch(false);
    }
  };

  const handleDeleteSavedSearch = async (id: string) => {
    try {
      await deleteSavedSearchMutation({ id });
      refetchSavedSearches({ requestPolicy: 'network-only' });
    } catch (err) {
      console.error('[Search] Failed to delete saved search:', err);
    }
  };

  const handleLoadSavedSearch = (saved: SavedSearch) => {
    setSearchParams({ q: saved.query });
    setShowSavedPanel(false);
  };

  const openSaveModal = (defaultName: string) => {
    setSavedSearchName(defaultName);
    setShowSaveModal(true);
  };

  return {
    savedSearches,
    showSaveModal,
    setShowSaveModal,
    savedSearchName,
    setSavedSearchName,
    savingSearch,
    saveError,
    showSavedPanel,
    setShowSavedPanel,
    handleSaveSearch,
    handleDeleteSavedSearch,
    handleLoadSavedSearch,
    openSaveModal,
  };
}
