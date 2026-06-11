import { GoogleGenAI } from "@google/genai";

import { requireEnv } from "@/lib/env";

// Lazy client construction: a missing key fails the individual request with
// a clear error instead of crashing every importing module at load time.
export function createGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") });
}
