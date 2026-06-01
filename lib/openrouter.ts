const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
}

function getConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  return {
    apiKey,
    baseUrl: process.env.OPENROUTER_BASE_URL || DEFAULT_BASE_URL,
    model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://sistemaflynow.com.br",
  };
}

export function isOpenRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export async function openRouterChat<T = unknown>({
  messages,
  responseFormat,
  temperature = 0.2,
  timeoutMs = 8000,
}: {
  messages: OpenRouterMessage[];
  responseFormat?: OpenRouterResponseFormat;
  temperature?: number;
  timeoutMs?: number;
}) {
  const config = getConfig();
  if (!config) {
    throw new Error("OPENROUTER_API_KEY não configurada");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "HTTP-Referer": config.appUrl,
        "X-Title": "FlyNow Analytics",
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        response_format: responseFormat,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OpenRouter timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`OpenRouter respondeu com HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter retornou resposta vazia");
  }

  return JSON.parse(content) as T;
}
