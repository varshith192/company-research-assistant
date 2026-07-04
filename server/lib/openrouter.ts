import type { ModelInfo } from "./types";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to your environment to enable AI analysis."
    );
  }
  return key;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(
  model: string,
  messages: ChatMessage[],
  temperature = 0.3
): Promise<string> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://company-research-assistant.vercel.app",
      "X-Title": "Company Research Assistant",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenRouter returned an empty response.");
  }
  return content;
}

export async function listModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${OPENROUTER_BASE}/models`, {
    headers: process.env.OPENROUTER_API_KEY
      ? { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }
      : {},
  });

  if (!res.ok) {
    throw new Error(`Failed to list OpenRouter models (${res.status})`);
  }

  const data = await res.json();
  const models = (data?.data ?? []) as Array<{
    id: string;
    name?: string;
    context_length?: number;
    pricing?: { prompt?: string };
  }>;

  return models
    .map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      contextLength: m.context_length ?? null,
      promptPrice: m.pricing?.prompt ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function parseJsonFromModel<T>(raw: string): T {
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error("Could not parse AI response as JSON.");
  }
}
