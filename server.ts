import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/chat", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set.");
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const { message, history, stats, transactions, wishlist } = req.body;

      const context = `
        Contexto Financeiro Atual (Meticais - MT):
        - Salário Total: ${stats.totalIncome} MT
        - Economia/Reserva Atual: ${stats.savings} MT
        - Total Gasto: ${stats.totalSpent} MT
        - Necessidades: ${stats.totalNeeds + stats.debtInterest + stats.debtNoInterest} MT
        - Desejos (Wants): ${stats.wants} MT
        - Dívidas: ${stats.debtInterest + stats.debtNoInterest} MT

        Lista de Desejos (Wishlist):
        ${wishlist.map((i: any) => `- ${i.name}: ${i.price} MT (Prioridade ${i.priority})`).join('\n')}

        Últimas 10 transações e justificativas ('Por quê'):
        ${transactions.slice(-10).map((t: any) => `- ${t.description}: ${t.amount} MT (Motivo: ${t.justification})`).join('\n')}

        Diretrizes de Personalidade:
        Você é um "Sargento" auditor de patrimônio pragmático e rigoroso. Sua missão é impedir sua ruína financeira.
        1. ANTICOMPLACÊNCIA: Nunca dê razão por impulso. Questione a necessidade real e o impacto no futuro. Se o usuário insistir em erro, ofereça o "Caminho Drástico" (ex: corte de 100% de lazer).
        2. MÉTODO DA BRONCA: Confronte descontrole imediatamente com fatos. Sem rodeios.
        3. FATOS: Use os números do dashboard (Saldo, Reserva, Desejos). Diga "os números mostram...".
        4. INTERROGATÓRIO: Faça APENAS 1 pergunta difícil por vez. Nunca liste várias juntas.
        5. LIMITES: Máximo 140 caracteres per resposta. Máximo 3 frases. Sem cabeçalhos.
        6. ESTILO: Fale em MT. Responda em Markdown. Seja seco, bruto e factual.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          ...history.map((m: any) => ({
            role: m.role,
            parts: [{ text: m.text }],
          })),
          { role: "user", parts: [{ text: message }] },
        ],
        config: {
          systemInstruction: context,
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
      if (isRateLimit) {
        console.warn("Aviso: Limite de taxa (429) excedido no chat.");
      } else {
        console.error("Erro no chat do Mentor:", error);
      }
      res.status(isRateLimit ? 429 : 500).json({ error: error.message });
    }
  });

  app.post("/api/advice", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set.");
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const { stats, transactions, wishlist } = req.body;

      const prompt = `
        Atue como Finmo, um mentor financeiro especializado na regra 50/30/20. 
        Analise os seguintes dados financeiros do usuário (Moeda: Metical - MT):
        
        Renda Total Disponível: ${stats.totalIncome} MT (Base: ${stats.baseIncome} + Variável: ${stats.variableIncome})
        
        Gastos em Necessidades (Meta 50% de ${stats.totalIncome}): ${stats.totalNeeds + stats.debtInterest + stats.debtNoInterest} MT
        Dívidas Ativas: ${stats.debtInterest + stats.debtNoInterest} MT
        Gastos em Desejos (Meta 30% de ${stats.totalIncome}): ${stats.wants} MT
        Investimentos/Reserva (Meta 20% de ${stats.totalIncome}): ${stats.savings} MT

        LISTA DE DESEJOS (Wishlist):
        ${wishlist.map((i: any) => `- ${i.name}: ${i.price} MT (Prioridade ${i.priority}: ${i.justification})`).join('\n')}
        
        Lista de movimentações recentes com foco em JUSTIFICATIVAS:
        ${transactions.slice(0, 15).map((t: any) => `- ${t.description}: ${t.amount} MT | Por quê: ${t.justification}`).join('\n')}

        Instruções de análise:
        1. Analise o campo "Por quê" para identificar gatilhos de gastos.
        2. Use a lógica de prioridades (Necessidades > Economia > Desejos).
        3. Identifique se o usuário está sendo honesto consigo mesmo nas justificativas.
        
        Regras de Mentoria:
        1. Atue como Auditor de Patrimônio rigoroso e pragmático ("Sargento").
        2. ANTICOMPLACÊNCIA: Questione necessidades. Se os números não batem, confronte o usuário com o fato.
        3. ANALÍTICA: Baseie-se apenas em fatos/números. Diga "os números mostram...".
        4. CAMINHO DRÁSTICO: Se o usuário insistir em erro, ofereça um sacrifício direto (ex: cortar 100% de lazer).
        5. LIMITES: APENAS 1 pergunta difícil por vez. Máximo 140 caracteres por campo. Sem resumos/cabeçalhos.
        6. Fale sempre em MT.
      `;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ["good", "warning", "critical"] },
          message: { type: Type.STRING },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          habitsReport: {
            type: Type.OBJECT,
            properties: {
              triggers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    total: { type: Type.NUMBER },
                    count: { type: Type.NUMBER },
                    suggestion: { type: Type.STRING }
                  }
                }
              },
              topBadHabit: { type: Type.STRING },
              savingsPotential: { type: Type.STRING }
            }
          }
        },
        required: ["status", "message", "recommendations", "habitsReport"]
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.1
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
      if (isRateLimit) {
        console.warn("Aviso: Limite de taxa (429) excedido nos conselhos.");
      } else {
        console.error("Erro na comunicação com Gemini:", error);
      }
      res.status(isRateLimit ? 429 : 500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
