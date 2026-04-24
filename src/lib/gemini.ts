import { GoogleGenAI } from "@google/genai";

export const MODEL_NAME = "gemini-2.0-flash";

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "YOUR_GEMINI_API_KEY") return null;
  return new GoogleGenAI({ apiKey: key });
}

export async function getTradingAdvice(prompt: string, marketContext: any) {
  const ai = getClient();
  if (!ai) return "AI assistant unavailable — please configure your GEMINI_API_KEY.";

  try {
    const formattedPrompt = `
      You are a professional DEX trading assistant for ARC PERP.
      
      CRITICAL: You are now analyzing REAL-TIME MARKET DATA from Binance.
      Current Market Context: ${JSON.stringify(marketContext)}
      User Question: ${prompt}
      
      Instructions:
      - Be concise, professional, and data-driven.
      - Use markdown for formatting.
      - Provide technical analysis based on the REAL market prices provided.
      - Mention that your advice is for educational purposes only.
      - Use terms like "Order Book Analysis", "Volatility", and "Real-time trends".
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: formattedPrompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm sorry, I'm having trouble analyzing the markets right now. Please try again in a moment.";
  }
}

export async function getMarketSignals(markets: any[]) {
  const ai = getClient();
  if (!ai) return "AI signals unavailable — please configure your GEMINI_API_KEY.";

  try {
    const prompt = `
      Analyze these markets and provide 3 quick trading signals (LONG or SHORT) with a brief reason.
      Markets: ${JSON.stringify(markets)}
      Return in simple markdown.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    return "Technical difficulty retrieving signals.";
  }
}
