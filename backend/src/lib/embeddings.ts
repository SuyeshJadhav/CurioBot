import { ai } from "./gemini";

// Process-level cache: lives for the lifetime of the Node process.
// Normalizing the key (trim + collapse \r\n) ensures we never pay twice
// for the same semantic text within a single pipeline run.
const embeddingCache = new Map<string, number[]>();

function normalizeKey(text: string): string {
  return text.trim().replace(/\r\n/g, "\n");
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const key = normalizeKey(text);
  const cached = embeddingCache.get(key);
  if (cached) {
    console.log(`⚡ [Embeddings Cache] Hit for: "${key.slice(0, 40).replace(/\n/g, " ")}..."`);
    return cached;
  }

  const result = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: key,
    config: { outputDimensionality: 768 },
  });

  if (!result.embeddings || result.embeddings.length === 0) {
    throw new Error("No embedding returned from Gemini");
  }

  const values = result.embeddings[0].values;
  if (!values) throw new Error("Embedding values are empty");

  embeddingCache.set(key, values);
  return values;
}
