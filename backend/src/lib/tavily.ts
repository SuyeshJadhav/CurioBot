import { tavily } from "@tavily/core";
import { withAbort } from "./gemini";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! })

export interface SearchResult {
	title: string,
	url: string,
	content: string,
	score: number
}

interface CachedSearch {
	results: SearchResult[];
	timestamp: number;
}

const searchCache = new Map<string, CachedSearch>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

export async function searchWeb(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
	const now = Date.now();
	const normalizedQuery = query.toLowerCase().trim();
	const cached = searchCache.get(normalizedQuery);
	if (cached && now - cached.timestamp < CACHE_TTL_MS) {
		console.log(`⚡ [Tavily Cache] Hit for: "${query}"`);
		return cached.results;
	}

	const searchPromise = (async () => {
		const response = await client.search(query, {
			maxResults: 5,
			searchDepth: "advanced"
		});

		const results = response.results.map((r) => ({
			title: r.title,
			url: r.url,
			content: r.content,
			score: r.score
		}));

		searchCache.set(normalizedQuery, { results, timestamp: now });
		return results;
	})();

	return withAbort(searchPromise, signal);
}