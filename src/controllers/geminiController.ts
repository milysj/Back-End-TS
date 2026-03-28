import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY, 
});

class GoogleGemini {
  async gerarTexto() {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: "Explain how AI works in a few words",
    });

    console.log(response.text);
    return response.text;
  }
}

export default new GoogleGemini();