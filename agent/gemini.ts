import { GoogleGenAI } from "@google/genai";

// Lazy client construction: a missing key fails the individual request with
// a clear error instead of crashing every importing module at load time.
export function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({ apiKey });
}
