import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getGeminiResponse = async (prompt: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });
  return response.text;
};
