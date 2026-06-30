/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { SavedSketch, LibraryCollection, CollectionArticle } from '../types/curio';
import {
  fetchSavedSketches,
  saveSketch,
  unsaveSketch,
  updateSketchNotes as apiUpdateSketchNotes,
  fetchLibraryCollections,
  createCollection as apiCreateCollection,
  addArticleToCollection as apiAddArticleToCollection,
  fetchCollectionArticles,
} from '../actions/libraryActions';
import { useBootstrap } from './BootstrapContext';
import { usePipeline } from './PipelineContext';

export interface LibraryContextType {
  savedSketches: SavedSketch[];
  libraryCollections: LibraryCollection[];
  activeCollectionId: string | null;
  collectionArticles: CollectionArticle[];
  loadSavedSketches: () => Promise<void>;
  toggleSaveArticle: (notes?: string) => Promise<void>;
  deleteSavedSketch: (articleId: string) => Promise<void>;
  updateSketchNotes: (articleId: string, notes: string) => Promise<void>;
  loadLibrary: () => Promise<void>;
  createCollection: (name: string, description?: string) => Promise<void>;
  addArticleToCollection: (collectionId: string, articleId: string) => Promise<void>;
  loadCollectionArticles: (collectionId: string) => Promise<void>;
  setActiveCollectionId: (id: string | null) => void;
}

const LibraryContext = createContext<LibraryContextType | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { bootstrap } = useBootstrap();
  const { currentArticleId, currentTopic, article, tldr } = usePipeline();

  const [savedSketches, setSavedSketches] = useState<SavedSketch[]>([]);
  const [libraryCollections, setLibraryCollections] = useState<LibraryCollection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [collectionArticles, setCollectionArticles] = useState<CollectionArticle[]>([]);

  // Seed from bootstrap data — avoids individual fetch-on-mount
  useEffect(() => {
    if (!bootstrap) return;
    setSavedSketches((bootstrap.saved ?? []) as SavedSketch[]);
    setLibraryCollections((bootstrap.library ?? []) as LibraryCollection[]);
  }, [bootstrap]);

  const loadSavedSketches = useCallback(async () => {
    const data = await fetchSavedSketches().catch(console.error);
    if (data) setSavedSketches(data);
  }, []);

  const loadLibrary = useCallback(async () => {
    const data = await fetchLibraryCollections().catch(console.error);
    if (data) setLibraryCollections(data);
  }, []);

  const toggleSaveArticle = useCallback(
    async (notes?: string) => {
      if (!currentArticleId) return;
      const isSaved = savedSketches.some((s) => s.article_id === currentArticleId);
      const prev = savedSketches;
      setSavedSketches((s) =>
        isSaved
          ? s.filter((x) => x.article_id !== currentArticleId)
          : [
              ...s,
              {
                id: `temp-${Date.now()}`,
                notes: notes ?? null,
                created_at: new Date().toISOString(),
                article_id: currentArticleId,
                articles: {
                  id: currentArticleId,
                  title: currentTopic ?? 'Topic',
                  domain: 'general',
                  summary: tldr ?? '',
                  content: article ?? '',
                },
              },
            ],
      );
      try {
        if (isSaved) await unsaveSketch(currentArticleId);
        else await saveSketch(currentArticleId, notes);
        await loadSavedSketches();
      } catch {
        setSavedSketches(prev);
      }
    },
    [currentArticleId, savedSketches, currentTopic, tldr, article, loadSavedSketches],
  );

  const deleteSavedSketch = useCallback(
    async (articleId: string) => {
      const prev = savedSketches;
      setSavedSketches((s) => s.filter((x) => x.article_id !== articleId));
      try {
        await unsaveSketch(articleId);
        await loadSavedSketches();
      } catch {
        setSavedSketches(prev);
      }
    },
    [savedSketches, loadSavedSketches],
  );

  const updateSketchNotes = useCallback(
    async (articleId: string, notes: string) => {
      await apiUpdateSketchNotes(articleId, notes);
      await loadSavedSketches();
    },
    [loadSavedSketches],
  );

  const createCollection = useCallback(
    async (name: string, description?: string) => {
      await apiCreateCollection(name, description);
      await loadLibrary();
    },
    [loadLibrary],
  );

  const addArticleToCollection = useCallback(
    async (collectionId: string, articleId: string) => {
      await apiAddArticleToCollection(collectionId, articleId);
    },
    [],
  );

  const loadCollectionArticles = useCallback(async (collectionId: string) => {
    const data = await fetchCollectionArticles(collectionId).catch(console.error);
    if (data) setCollectionArticles(data);
  }, []);

  return (
    <LibraryContext.Provider
      value={{
        savedSketches,
        libraryCollections,
        activeCollectionId,
        collectionArticles,
        loadSavedSketches,
        toggleSaveArticle,
        deleteSavedSketch,
        updateSketchNotes,
        loadLibrary,
        createCollection,
        addArticleToCollection,
        loadCollectionArticles,
        setActiveCollectionId,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextType {
  const ctx = useContext(LibraryContext);
  if (!ctx)
    throw new Error('[Curios] useLibrary() must be called inside <LibraryProvider>.');
  return ctx;
}
