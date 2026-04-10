import { Request, Response } from "express";

/**
 * Rota de teste legada. O LLM fica em outro repositório; defina LLM_DEMO_URL (POST JSON { "prompt": string })
 * se quiser um espelho aqui, ou remova o uso deste handler.
 */
class GoogleGemini {
  gerarTexto = async (_req: Request, res: Response): Promise<Response> => {
    const demoUrl = process.env.LLM_DEMO_URL?.trim();
    if (!demoUrl) {
      return res.status(503).json({
        message:
          "LLM executado em microsserviço externo. Opcional: defina LLM_DEMO_URL para POST { prompt } neste endpoint de teste.",
      });
    }

    try {
      const r = await fetch(demoUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(process.env.LLM_DEMO_API_KEY ? { Authorization: `Bearer ${process.env.LLM_DEMO_API_KEY}` } : {}),
        },
        body: JSON.stringify({ prompt: "Explain how AI works in a few words" }),
      });
      const text = await r.text();
      let json: unknown;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        return res.status(502).json({ message: "LLM_DEMO_URL retornou corpo não-JSON", raw: text?.slice(0, 500) });
      }
      if (!r.ok) {
        return res.status(502).json({ message: `LLM_DEMO_URL HTTP ${r.status}`, body: json });
      }
      return res.json(json);
    } catch (error) {
      const err = error as Error;
      console.error("LLM_DEMO_URL:", err);
      return res.status(500).json({ message: "Erro ao chamar LLM_DEMO_URL", error: err.message });
    }
  };
}

export default new GoogleGemini();
