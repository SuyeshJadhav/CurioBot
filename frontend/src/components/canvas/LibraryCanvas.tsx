import { useState, useEffect } from 'react';
import { usePipeline } from '../../contexts/PipelineContext';
import { useLibrary } from '../../contexts/LibraryContext';
import { ListSkeleton } from '../common/Skeletons';
import { HistoryTab } from '../library/HistoryTab';
import { SavedTab } from '../library/SavedTab';
import { ShelvesTab } from '../library/ShelvesTab';
import { ShelfFolderView } from '../library/ShelfFolderView';

export function LibraryCanvas() {
  const { history, deleteArticle, loadArticle, isLoadingHistory } = usePipeline();
  const {
    savedSketches, deleteSavedSketch, updateSketchNotes, loadSavedSketches,
    libraryCollections, activeCollectionId, collectionArticles, loadLibrary,
    createCollection, loadCollectionArticles, setActiveCollectionId,
  } = useLibrary();
  const isLoadingUserData = isLoadingHistory;

  const [filter, setFilter] = useState<'all' | 'saved' | 'read' | 'topic'>('all');
  const [now] = useState(() => new Date());

  useEffect(() => {
    loadLibrary();
    loadSavedSketches();
  }, [loadLibrary, loadSavedSketches]);

  const handleFolderSelect = (collectionId: string) => {
    setActiveCollectionId(collectionId);
    loadCollectionArticles(collectionId);
  };

  // Helper to format dates
  const formatDateLabel = (dateInput?: Date | string) => {
    if (!dateInput) return 'Some time ago';
    const d = new Date(dateInput);
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  if (isLoadingUserData) {
    return (
      <div style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto', position: 'relative' }}>
        <div className="noise-overlay" />
        <h2 className="section-title">Library</h2>
        <p className="section-sub">All your articles in one place — saved, read, and by topic</p>
        <div className="filter-row" style={{ opacity: 0.5, pointerEvents: 'none' }}>
          <button className="filter-btn on">All</button>
          <button className="filter-btn">Saved</button>
          <button className="filter-btn">Read</button>
          <button className="filter-btn">By topic</button>
        </div>
        <ListSkeleton count={4} />
      </div>
    );
  }

  // Render By Topic Sub-View Folder (Shelf Folder View)
  if (filter === 'topic' && activeCollectionId) {
    return (
      <ShelfFolderView
        activeCollectionId={activeCollectionId}
        libraryCollections={libraryCollections}
        collectionArticles={collectionArticles}
        loadArticle={loadArticle}
        setActiveCollectionId={setActiveCollectionId}
      />
    );
  }

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto', position: 'relative' }}>
      <div className="noise-overlay" />
      
      {/* Header */}
      <h2 className="section-title">Library</h2>
      <p className="section-sub">All your articles in one place — saved, read, and by topic</p>

      {/* Filter Row */}
      <div className="filter-row">
        <button className={`filter-btn${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`filter-btn${filter === 'saved' ? ' on' : ''}`} onClick={() => setFilter('saved')}>Saved</button>
        <button className={`filter-btn${filter === 'read' ? ' on' : ''}`} onClick={() => setFilter('read')}>Read</button>
        <button className={`filter-btn${filter === 'topic' ? ' on' : ''}`} onClick={() => setFilter('topic')}>By topic</button>
      </div>

      {/* History (All & Read) Tab */}
      <HistoryTab
        filter={filter}
        history={history}
        savedSketches={savedSketches}
        loadArticle={loadArticle}
        deleteArticle={deleteArticle}
        formatDateLabel={formatDateLabel}
      />

      {/* Saved Tab */}
      <SavedTab
        filter={filter}
        savedSketches={savedSketches}
        loadArticle={loadArticle}
        deleteSavedSketch={deleteSavedSketch}
        updateSketchNotes={updateSketchNotes}
      />

      {/* By Topic Shelves Tab */}
      <ShelvesTab
        filter={filter}
        libraryCollections={libraryCollections}
        createCollection={createCollection}
        handleFolderSelect={handleFolderSelect}
      />

    </div>
  );
}
