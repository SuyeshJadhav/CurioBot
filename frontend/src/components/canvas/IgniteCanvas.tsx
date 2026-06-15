import { usePipeline } from '../../contexts/PipelineContext';
import { useLibrary } from '../../contexts/LibraryContext';
import { IgniteHero } from '../ignite/IgniteHero';
import { IgniteLoading } from '../ignite/IgniteLoading';
import { IgniteArticle } from '../ignite/IgniteArticle';

export function IgniteCanvas() {
  const {
    article, currentTopic, currentArticleId, isGeneratingArticle,
    generationStatus, igniteQuest,
  } = usePipeline();
  const { savedSketches, toggleSaveArticle, libraryCollections, addArticleToCollection } = useLibrary();

  // Loading state
  if (isGeneratingArticle) {
    return (
      <IgniteLoading
        currentTopic={currentTopic}
        generationStatus={generationStatus}
      />
    );
  }

  // Article state
  if (article) {
    return (
      <IgniteArticle
        article={article}
        currentTopic={currentTopic}
        currentArticleId={currentArticleId}
        igniteQuest={igniteQuest}
        savedSketches={savedSketches}
        toggleSaveArticle={toggleSaveArticle}
        libraryCollections={libraryCollections}
        addArticleToCollection={addArticleToCollection}
      />
    );
  }

  // Idle / hero state
  return (
    <IgniteHero igniteQuest={igniteQuest} />
  );
}
