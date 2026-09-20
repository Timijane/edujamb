import { GoogleGenAI } from "@google/genai";
import type { AIRequest } from "./ai-router";

export async function generateWithGemini(
  request: AIRequest,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: request.userPrompt,
    config: {
      systemInstruction: request.systemPrompt,
      maxOutputTokens: request.maxTokens ?? 1000,
      temperature: 0.4,
    },
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}
