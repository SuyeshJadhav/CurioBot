import { API_BASE, getHeaders, handleResponse } from './apiClient';

// ── Saved Sketches ────────────────────────────────────────────────────────────

export async function fetchSavedSketches(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/saved`, { method: 'GET', headers: getHeaders() });
  return handleResponse<any[]>(res, 'Failed to fetch saved sketches');
}

export async function saveSketch(articleId: string, notes?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/saved`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ articleId, notes }),
  });
  await handleResponse<any>(res, 'Failed to save sketch');
}

export async function updateSketchNotes(articleId: string, notes: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/saved/${articleId}/notes`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ notes }),
  });
  await handleResponse<any>(res, 'Failed to update sketch notes');
}

export async function unsaveSketch(articleId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/saved/${articleId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  await handleResponse<any>(res, 'Failed to unsave sketch');
}

// ── Library Collections ───────────────────────────────────────────────────────

export async function fetchLibraryCollections(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/library`, { method: 'GET', headers: getHeaders() });
  return handleResponse<any[]>(res, 'Failed to fetch collections');
}

export async function createCollection(name: string, description?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/library`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, description }),
  });
  return handleResponse<any>(res, 'Failed to create collection');
}

export async function fetchCollectionArticles(collectionId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/library/${collectionId}/articles`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<any[]>(res, 'Failed to fetch collection articles');
}

export async function addArticleToCollection(collectionId: string, articleId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/library/${collectionId}/articles`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ articleId }),
  });
  await handleResponse<any>(res, 'Failed to add article to collection');
}

export async function fetchRecommendations(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/generate/recommendations`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<any[]>(res, 'Failed to fetch recommendations');
}
