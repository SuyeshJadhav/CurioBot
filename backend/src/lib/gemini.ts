import { GoogleGenAI } from "@google/genai";

const baseAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Helper to wrap API calls with retry logic on 429 or 503
async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const isRetryable = err?.status === "RESOURCE_EXHAUSTED" || 
                        err?.status === 429 || 
                        err?.status === 503 ||
                        err?.status === "UNAVAILABLE" ||
                        String(err).includes("429") || 
                        String(err).includes("503") ||
                        String(err).includes("RESOURCE_EXHAUSTED") ||
                        String(err).includes("UNAVAILABLE");
    if (isRetryable && retries > 0) {
      console.warn(`⚠️ [Gemini API] Rate limited or Unavailable (${err?.status || '503'}). Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

export const ai = {
  models: {
    generateContent: (args: any) => withRetry(() => baseAi.models.generateContent(args)),
    embedContent: (args: any) => withRetry(() => baseAi.models.embedContent(args)),
  },
  chats: {
    create: (args: any) => {
      const chat = baseAi.chats.create(args);
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