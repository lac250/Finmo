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

      const { message, history = [], stats = {}, transactions = [], wishlist = [] } = req.body || {};

      const totalIncome = stats.totalIncome || 0;
      const savings = stats.savings || 0;
      const totalSpent = stats.totalSpent || 0;
      const debt = (stats.debtInterest || 0) + (stats.debtNoInterest || 0);
      const totalNeeds = (stats.totalNeeds || 0) + debt;
      const wants = stats.wants || 0;

      const context = `
        Contexto Financeiro Atual (Meticais - MT):
        - Salário Total: ${totalIncome} MT
        - Economia/Reserva Atual: ${savings} MT
        - Total Gasto: ${totalSpent} MT
        - Necessidades: ${totalNeeds} MT
        - Desejos (Wants): ${wants} MT
        - Dívidas: ${debt} MT

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
        model: "gemini-3.8-flash",
        contents: [
          ...history.map((m: any) => ({
            role: m.role === 'model' ? 'model' : 'user',
            parts: [{ text: m.text || '' }],
          })),
          { role: "user", parts: [{ text: message || '' }] },
        ],
        config: {
          systemInstruction: context,
        },
      });

      res.json({ text: response.text || "Sem resposta do mentor." });
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED');
      if (isRateLimit) {
        console.warn("Aviso: Limite de cota do Gemini atingido. Respondendo com auditoria autônoma.");
        return res.json({
          text: "Atenção: O sistema de IA atingiu temporariamente o limite diário da cota. Mas o Sargento deixa a ordem: corte qualquer compra por impulso agora e mantenha seus gastos essenciais abaixo de 50%!"
        });
      }
      console.error("Erro no chat do Mentor:", error);
      res.json({
        text: "Tive uma instabilidade momentânea na conexão com o servidor de IA. Mantenha os olhos nas suas finanças e siga rigorosamente a regra 50/30/20."
      });
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

      const { stats = {}, transactions = [], wishlist = [] } = req.body || {};

      const totalIncome = stats.totalIncome || 0;
      const baseIncome = stats.baseIncome || 0;
      const variableIncome = stats.variableIncome || 0;
      const debt = (stats.debtInterest || 0) + (stats.debtNoInterest || 0);
      const totalNeeds = (stats.totalNeeds || 0) + debt;
      const wants = stats.wants || 0;
      const savings = stats.savings || 0;

      const prompt = `
        Atue como Finmo, um mentor financeiro especializado na regra 50/30/20. 
        Analise os seguintes dados financeiros do usuário (Moeda: Metical - MT):
        
        Renda Total Disponível: ${totalIncome} MT (Base: ${baseIncome} + Variável: ${variableIncome})
        
        Gastos em Necessidades (Meta 50% de ${totalIncome}): ${totalNeeds} MT
        Dívidas Ativas: ${debt} MT
        Gastos em Desejos (Meta 30% de ${totalIncome}): ${wants} MT
        Investimentos/Reserva (Meta 20% de ${totalIncome}): ${savings} MT

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
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.1
        }
      });

      let parsedData: any = null;
      try {
        let rawText = response.text || "{}";
        rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          rawText = rawText.substring(jsonStart, jsonEnd + 1);
        }
        parsedData = JSON.parse(rawText);
      } catch (parseErr) {
        console.warn("Falha no JSON.parse da resposta do Gemini:", parseErr);
      }

      if (!parsedData || !parsedData.status || !Array.isArray(parsedData.recommendations)) {
        const needsRatio = totalIncome > 0 ? (totalNeeds / totalIncome) * 100 : 0;
        const wantsRatio = totalIncome > 0 ? (wants / totalIncome) * 100 : 0;
        parsedData = {
          status: needsRatio > 55 ? "critical" : wantsRatio > 35 ? "warning" : "good",
          message: needsRatio > 55 
            ? "ALERTA: Suas necessidades básicas estão consumindo mais de 55% da sua renda."
            : wantsRatio > 35 
              ? "Cuidado com os desejos: você está ultrapassando o limite recomendado de 30% em lazer."
              : "Seus números estão equilibrados dentro da regra 50/30/20. Mantenha a disciplina.",
          recommendations: [
            "Mantenha o registro de todos os seus gastos em Meticais",
            "Reforce sua reserva de emergência antes de novos supérfluos"
          ],
          habitsReport: {
            triggers: [
              { name: "Gastos com Desejos", total: wants, count: 1, suggestion: "Analise despesas por impulso" }
            ],
            topBadHabit: wantsRatio > 30 ? "Excesso de despesas não essenciais" : "Equilíbrio geral mantido",
            savingsPotential: `${Math.round(totalIncome * 0.1)} MT`
          }
        };
      }

      res.json(parsedData);
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED');
      if (isRateLimit) {
        console.warn("Aviso: Limite de taxa (429) excedido nos conselhos. Fornecendo análise 50/30/20 autônoma.");
      } else {
        console.warn("Aviso na comunicação com Gemini, fornecendo análise estruturada autônoma:", error?.message);
      }
      
      const stats = req.body?.stats || {};
      const totalIncome = stats.totalIncome || 0;
      const debt = (stats.debtInterest || 0) + (stats.debtNoInterest || 0);
      const totalNeeds = (stats.totalNeeds || 0) + debt;
      const wants = stats.wants || 0;
      const needsRatio = totalIncome > 0 ? (totalNeeds / totalIncome) * 100 : 0;
      const wantsRatio = totalIncome > 0 ? (wants / totalIncome) * 100 : 0;

      res.json({
        status: needsRatio > 55 ? "critical" : wantsRatio > 35 ? "warning" : "good",
        message: needsRatio > 55 
          ? "ALERTA DE AUDITORIA: Suas necessidades básicas estão consumindo mais de 55% da sua renda total em MT."
          : wantsRatio > 35 
            ? "CUIDADO: Seus gastos com desejos estão acima do teto de 30% da sua renda."
            : "Seus números estão em equilíbrio dentro dos parâmetros da regra 50/30/20.",
        recommendations: [
          needsRatio > 55 ? "Renegocie ou corte despesas fixas para voltar aos 50%" : "Mantenha o registro minucioso de cada despesa diária",
          wantsRatio > 35 ? "Congele gastos discricionários nos próximos 7 dias" : "Destine qualquer sobra diretamente à sua reserva de emergência"
        ],
        habitsReport: {
          triggers: [
            { name: "Gastos com Desejos", total: wants, count: 1, suggestion: "Acompanhe de perto as pequenas despesas diárias" }
          ],
          topBadHabit: wantsRatio > 30 ? "Gastos discricionários acima do teto" : "Nenhum desvio crítico detectado",
          savingsPotential: `${Math.round(totalIncome * 0.1)} MT`
        }
      });
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
