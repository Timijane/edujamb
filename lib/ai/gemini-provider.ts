import { GoogleGenAI } from "@google/genai";
import type { AIRequest } from "./ai-router";

const MODEL = "gemini-3.8-flash";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({ apiKey });
}

const TOOLS = [
  {
    type: "google_search" as const,
  },
];

export async function generateWithGemini(
  request: AIRequest,
): Promise<string> {
  const ai = getClient();

  const interaction = await ai.interactions.create({
    model: MODEL,
    input: [
      {
        type: "text",
        text: request.userPrompt,
      },
    ],
    system_instruction: request.systemPrompt,
    tools: TOOLS,
    generation_config: {
      max_output_tokens: request.maxTokens ?? 1200,
    },
  });

  const text = interaction.output_text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

export async function streamWithGemini(
  request: AIRequest,
  previousInteractionId?: string,
) {
  const ai = getClient();

  return ai.interactions.create({
    model: MODEL,
    input: [
      {
        type: "text",
        text: request.userPrompt,
      },
    ],
    system_instruction: request.systemPrompt,
    previous_interaction_id: previousInteractionId,
    tools: TOOLS,
    generation_config: {
      max_output_tokens: request.maxTokens ?? 1200,
    },
    stream: true,
  });
}
