import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const getModel = (systemInstruction?: string) =>
  genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    ...(systemInstruction && { systemInstruction }),
  });
