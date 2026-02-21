import { GoogleGenAI, Type } from "@google/genai";
import { Language, ScanResult } from "../types";

const getAI = () => {
  const apiKey = 
    process.env.GEMINI_API_KEY || 
    process.env.VITE_GEMINI_API_KEY || 
    import.meta.env.VITE_GEMINI_API_KEY;
    
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please set it in your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export async function analyzePlant(imageBase64: string, language: Language): Promise<ScanResult> {
  const ai = getAI();
  const langMap: Record<Language, string> = {
    en: "English",
    hi: "Hindi",
    te: "Telugu",
    ta: "Tamil"
  };

  const prompt = `Analyze this plant leaf image. 
  Identify the crop name and if there is any disease.
  
  IMPORTANT: ALL text values in the JSON response MUST be in ${langMap[language]}.
  Use very simple, farmer-friendly words in ${langMap[language]}. 
  Short sentences only. No scientific jargon.
  
  If the image is not a plant leaf or is too blurry/dark, set unclearImage to true.
  
  If healthy, provide basic care tips in ${langMap[language]}.
  If diseased, provide (all in ${langMap[language]}):
  - Disease name
  - Simple description
  - Main symptoms
  - Organic treatment steps
  - Safe chemical treatment with simple dosage (NEVER suggest banned chemicals)
  - Prevention tips
  
  Include a safety warning for chemical usage: "Wear gloves, wear mask, keep away from children" (translated to ${langMap[language]}).`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64.split(",")[1]
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cropName: { type: Type.STRING },
          diseaseName: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          isHealthy: { type: Type.BOOLEAN },
          description: { type: Type.STRING },
          symptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
          organicTreatment: { type: Type.ARRAY, items: { type: Type.STRING } },
          chemicalTreatment: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              dosage: { type: Type.STRING }
            },
            required: ["name", "dosage"]
          },
          preventionTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          careTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          unclearImage: { type: Type.BOOLEAN }
        },
        required: ["cropName", "diseaseName", "confidence", "isHealthy", "description"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
