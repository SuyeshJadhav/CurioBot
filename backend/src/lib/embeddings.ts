import { ai } from "./gemini";

const embeddingCache = new Map<string, number[]>();

export async function generateEmbedding(text: string): Promise<number[]> {
	const cached = embeddingCache.get(text);
	if (cached) {
		console.log(`⚡ [Embeddings Cache] Hit for: "${text.slice(0, 30).replace(/\n/g, ' ')}..."`);
		return cached;
	}

	const result = await ai.models.embedContent({
		model: "gemini-embedding-001",
		contents: text,
		config: { outputDimensionality: 768 }
	});

	if (!result.embeddings || result.embeddings.length === 0) {
		throw new Error("No embedding returned from Gemini");
	}

	const values = result.embeddings[0].values;
	if (!values) {
		throw new Error("Embedding values are empty");
	}
	embeddingCache.set(text, values);
	return values;
}
