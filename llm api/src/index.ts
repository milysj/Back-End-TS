import express, { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Validação preventiva para garantir que o .env foi carregado
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ ERRO: A variável GEMINI_API_KEY não foi encontrada no arquivo .env");
  process.exit(1);
}

// Inicialização do SDK do Google Generative AI
// Nota: Mantendo o nome da classe da biblioteca instalada (@google/generative-ai)
// e garantindo que a API Key seja lida da variável de ambiente.
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/generate-text', async (req: Request, res: Response) => {
  const { tema } = req.body;

  if (!tema) {
    return res.status(400).json({ error: 'O campo "tema" é obrigatório.' });
  }

  try {
    // Usando o modelo solicitado no seu código base. 
    // ATENÇÃO: Se retornar erro 404, altere para "gemini-1.5-flash"
    const model = ai.getGenerativeModel({ model: "gemini-3-flash-preview", 
      generationConfig: { responseMimeType: "application/json" }

    });
    // Alterado para "gemini-1.5-flash" e configurado para retornar JSON puro (JSON Mode)
    // const model = ai.getGenerativeModel({ 
    //   model: "gemini-1.5-flash",
    //   generationConfig: { responseMimeType: "application/json" }
    // });

    // Unindo o seu prompt base com o tema recebido pela requisição
       const prompt = `Gere um conteúdo educativo sobre o tema: ${tema}.
    O retorno deve ser um objeto JSON com a seguinte estrutura:
    {
      "resumo": "um resumo educativo e amigável para estudantes",
      "perguntas": [
        {
          "enunciado": "pergunta de múltipla escolha",
          "opcoes": ["alternativa A", "alternativa B", "alternativa C", "alternativa D"],
          "resposta_correta": "A letra ou texto da alternativa correta"
        }
      ]
    }
    Gere exatamente 4 perguntas.`;

    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Converte a string da IA em um objeto JSON real para que o front-end possa ler as propriedades
    const jsonResponse = JSON.parse(text);


   return res.json({
      tema,
      texto_gerado: text,
      ...jsonResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erro ao gerar conteúdo:', error);
    return res.status(500).json({ 
      error: 'Falha ao processar a solicitação com a LLM.',
      details: error.message 
    });
  }
});

// Rota para listar modelos disponíveis e resolver o erro 404
app.get('/models', async (_req: Request, res: Response) => {
  try {
    // O SDK simplificado não possui o método listModels().
    // Retornamos apenas os nomes válidos conhecidos.
    return res.json({ 
      modelos_disponiveis: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"] 
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Erro interno ao processar modelos." });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serviço de LLM ativo' });
});

app.listen(PORT, () => {
  console.log(`🚀 API de Geração de Texto rodando em http://localhost:${PORT}`);
});
