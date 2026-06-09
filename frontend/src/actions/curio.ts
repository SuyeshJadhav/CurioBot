/**
 * actions/curio.ts — Legacy barrel re-export.
 *
 * All action logic has been split into focused modules:
 *   authActions.ts    — login, register, fetchCurrentUser
 *   pipelineActions.ts — runCurioPipeline, fetchHistory, fetchArticleById, deleteArticle
 *   libraryActions.ts  — sketches, wonder, collections
 *   settingsActions.ts — settings, interests, askTutor
 *   apiClient.ts       — shared fetch helpers
 */
export * from './authActions';
export * from './pipelineActions';
export * from './libraryActions';
export * from './settingsActions';
export * from './apiClient';
