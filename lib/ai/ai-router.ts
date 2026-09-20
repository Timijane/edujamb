import { generateWithGemini } from "./gemini-provider";
export type AIProviderName =
  | "gemini"
  | "groq"
  | "cerebras"
  | "openrouter"
  | "fallback";

export type AIRequest = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
};

export type AIResponse = {
  provider: AIProviderName;
  text: string;
};

type AIProvider = {
  name: AIProviderName;
  enabled: boolean;
  generate: (request: AIRequest) => Promise<string>;
};

function unavailableProvider(
  name: AIProviderName,
): AIProvider {
  return {
    name,
    enabled: false,
    generate: async () => {
      throw new Error(`${name} is not configured.`);
    },
  };
}

const providers: AIProvider[] = [
  {
    name: "gemini",
    enabled: Boolean(process.env.GEMINI_API_KEY),
    generate: generateWithGemini,
  },
  unavailableProvider("groq"),
  unavailableProvider("cerebras"),
  unavailableProvider("openrouter"),
];

function isRetryableProviderError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return (
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("quota") ||
    message.includes("timeout") ||
    message.includes("temporarily unavailable") ||
    message.includes("503") ||
    message.includes("502")
  );
}

export async function generateAIResponse(
  request: AIRequest,
): Promise<AIResponse> {
  const enabledProviders = providers.filter(
    (provider) => provider.enabled,
  );

  if (enabledProviders.length === 0) {
    throw new Error(
      "No AI provider is currently configured.",
    );
  }

  const failures: string[] = [];

  for (const provider of enabledProviders) {
    try {
      const text = await provider.generate(request);

      if (!text.trim()) {
        throw new Error("AI provider returned an empty response.");
      }

      return {
        provider: provider.name,
        text: text.trim(),
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown provider error.";

      failures.push(`${provider.name}: ${message}`);

      if (!isRetryableProviderError(error)) {
        continue;
      }
    }
  }

  throw new Error(
    `All configured AI providers failed. ${failures.join(" | ")}`,
  );
}
