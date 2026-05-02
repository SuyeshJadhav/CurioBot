import { tavily } from "@tavily/core";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! })

export interface SearchResult {
	title: string,
	url: string,
	content: string,
	score: number
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
	const response = await client.search(query, {
		maxResults: 5,
		searchDepth: "advanced"
	})

	return response.results.map((r) => ({
		title: r.title,
		url: r.url,
		content: r.content,
		score: r.score
	}))
}