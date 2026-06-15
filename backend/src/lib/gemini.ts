import { GoogleGenAI } from "@google/genai";

let baseAiInstance: GoogleGenAI | null = null;

function getAi(): GoogleGenAI {
  if (!baseAiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ [Gemini Client] GEMINI_API_KEY is not defined in process.env!");
    }
    baseAiInstance = new GoogleGenAI({ apiKey: apiKey || "" });
  }
  return baseAiInstance;
}

// Helper to wrap API calls with retry logic on 429, 503, or transient network failures
async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const errString = String(err).toLowerCase();
    const errCauseString = err?.cause ? String(err.cause).toLowerCase() : "";
    const isAbort = err?.name === "AbortError" || err?.message === "Aborted" || errString.includes("abort");

    const isRetryable = !isAbort && (
      err?.status === "RESOURCE_EXHAUSTED" || 
      err?.status === 429 || 
      err?.status === 503 ||
      err?.status === "UNAVAILABLE" ||
      errString.includes("429") || 
      errString.includes("503") ||
      errString.includes("resource_exhausted") ||
      errString.includes("unavailable") ||
      errString.includes("fetch failed") ||
      errString.includes("econnreset") ||
      errString.includes("timeout") ||
      errCauseString.includes("econnreset") ||
      errCauseString.includes("timeout")
    );

    if (isRetryable && retries > 0) {
      console.warn(`⚠️ [Gemini API] Call failed (${err.message || err}). Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

export const ai = {
  models: {
    generateContent: (args: any) => withRetry(() => getAi().models.generateContent(args)),
    embedContent: (args: any) => withRetry(() => getAi().models.embedContent(args)),
  },
  chats: {
    create: (args: any) => {
      const chat = getAi().chats.create(args);
      const originalSendMessage = chat.sendMessage.bind(chat);
      chat.sendMessage = (msgArgs: any) => withRetry(() => originalSendMessage(msgArgs));
      return chat;
    }
  }
} as any;

export const safetySettings = [
	{
		category: "HARM_CATEGORY_HARASSMENT",
		threshold: "BLOCK_MEDIUM_AND_ABOVE",
	},
	{
		category: "HARM_CATEGORY_HATE_SPEECH",
		threshold: "BLOCK_MEDIUM_AND_ABOVE",
	},
	{
		category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
		threshold: "BLOCK_MEDIUM_AND_ABOVE",
	},
	{
		category: "HARM_CATEGORY_DANGEROUS_CONTENT",
		threshold: "BLOCK_MEDIUM_AND_ABOVE",
	},
] as const;