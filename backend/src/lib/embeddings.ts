import { ai } from "./gemini";

export async function generateEmbedding(text: string) {
	const result = await ai.models.embedContent({
		model: "gemini-embedding-001",
		contents: text,
		config: { outputDimensionality: 768 }
	});

	if (!result.embeddings || result.embeddings.length === 0) {
		throw new Error("No embedding returned from Gemini");
	}

	return result.embeddings[0].values;
}
