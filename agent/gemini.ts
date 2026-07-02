import { GoogleGenAI } from "@google/genai";
import type { GenerateContentConfig } from "@google/genai";

import { requireEnv } from "@/lib/env";

// Lazy client construction: a missing key fails the individual request with
// a clear error instead of crashing every importing module at load time.
export function createGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") });
}

export const GEMINI_GENERATE_CONTENT_TIMEOUT_MS = 30_000;

export function withGeminiTimeout(
  config: GenerateContentConfig,
): GenerateContentConfig {
  return {
    ...config,
    httpOptions: {
      ...config.httpOptions,
      timeout:
        config.httpOptions?.timeout ?? GEMINI_GENERATE_CONTENT_TIMEOUT_MS,
    },
    abortSignal:
      config.abortSignal ??
      AbortSignal.timeout(GEMINI_GENERATE_CONTENT_TIMEOUT_MS),
  };
}

function findBalancedObject(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

export function extractFirstJsonObject(text: string): string | null {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") {
      continue;
    }

    const candidate = findBalancedObject(text, i);
    if (!candidate) {
      continue;
    }

    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Extracts and parses the first JSON object from a text response.
 * Uses a robust bracket-depth balanced parser with a fallback to regex-based extraction.
 */
export function parseGeminiJsonResponse<T>(text: string): T {
  const trimmed = text.trim();
  const balanced = extractFirstJsonObject(trimmed);

  if (balanced) {
    return JSON.parse(balanced) as T;
  }

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in model response");
  }

  return JSON.parse(jsonMatch[0]) as T;
}

