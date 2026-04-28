import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, CategoryType, BudgetStats } from "../types";

// VITE_ prefix is required for client-side usage in Vite (Vercel)
// GEMINI_API_KEY is standard in AI Studio
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;

try {
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
  } else {
    console.error("GEMINI_API_KEY missing. Advice features will not work.");
  }
} catch (e) {
  console.error("AI Initialization failed:", e);
}

export const getFinancialAdvice = async (
  stats: BudgetStats,
  transactions: Transaction[],
  totalIncome: number
) => {
  if (!ai) {
    return {
      status: 'warning',
      message: 'Sistema de mentoria indisponível. Verifique sua chave API (VITE_GEMINI_API_KEY).',
      recommendations: ['Consulte seu saldo manualmente', 'Foque no básico: 50% necessidades', 'Evite novos gastos']
    };
  }

  const prompt = `
    Atue como Finmo, um mentor financeiro especializado na regra 50/30/20. 
    Analise os seguintes dados financeiros do usuário (Moeda: Metical - MT):
    
    Renda Total Disponível: ${stats.totalIncome} MT (Base: ${stats.baseIncome} + Variável: ${stats.variableIncome})
    
    Gastos em Necessidades (Meta 50% de ${stats.totalIncome}): ${stats.totalNeeds + stats.debtInterest + stats.debtNoInterest} MT
    Dívidas Ativas: ${stats.debtInterest + stats.debtNoInterest} MT
    Gastos em Desejos (Meta 30% de ${stats.totalIncome}): ${stats.wants} MT
    Investimentos/Reserva (Meta 20% de ${stats.totalIncome}): ${stats.savings} MT
    
    Lista de movimentações recentes:
    ${transactions.slice(0, 15).map(t => `- ${t.category === 'INCOME' ? 'ENTRADA' : 'SAÍDA'}: ${t.description} - ${t.amount} MT (${t.subcategory})`).join('\n')}

    Sua resposta deve ser em JSON seguindo este esquema:
    {
      "status": "good" | "warning" | "critical",
      "message": "Uma mensagem curta, pragmática e incentivadora.",
      "recommendations": ["Recomendação 1", "Recomendação 2", "Recomendação 3"]
    }

    Regras de Mentoria:
    1. Se houver Renda Variável expressiva, sugira alocar 100% dela para a Reserva de Emergência ou Dívidas se o usuário estiver fora das metas.
    2. Se Necessidades + Dívidas > 50% da renda total, status é 'critical'.
    3. Fale sempre em Meticais (MT). Seja direto e encorajador.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Erro ao obter conselho da IA:", error);
    return {
      status: 'warning',
      message: 'Houve um erro na análise, mas continue monitorando suas entradas variáveis para acelerar sua independência.',
      recommendations: ['Mantenha o registro de proveniência', 'Não gaste a renda extra antes de recebê-la', 'Foco na reserva']
    };
  }
};
