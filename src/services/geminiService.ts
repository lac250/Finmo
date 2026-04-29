import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, CategoryType, BudgetStats } from "../types";

// GEMINI_API_KEY is standard in AI Studio
const apiKey = process.env.GEMINI_API_KEY;

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

export const getChatResponse = async (
  message: string,
  history: { role: 'user' | 'model', text: string }[],
  stats: BudgetStats,
  transactions: Transaction[]
) => {
  if (!ai) return "Sistema de chat indisponível no momento.";

  const context = `
    Contexto Financeiro Atual (Meticais - MT):
    - Salário Total: ${stats.totalIncome} MT
    - Economia/Reserva Atual: ${stats.savings} MT
    - Total Gasto: ${stats.totalSpent} MT
    - Necessidades: ${stats.totalNeeds + stats.debtInterest + stats.debtNoInterest} MT
    - Desejos (Wants): ${stats.wants} MT
    - Dívidas: ${stats.debtInterest + stats.debtNoInterest} MT

    Últimas 10 transações e justificativas:
    ${transactions.slice(-10).map(t => `- ${t.description}: ${t.amount} MT (${t.justification})`).join('\n')}

    Diretrizes de Personalidade:
    Você é o Finmo, um mentor financeiro moçambicano experiente, pragmático e atencioso.
    Sua missão é ajudar o usuário a tomar decisões mais inteligentes e comportamentalmente saudáveis.
    Use expressões moçambicanas de forma natural. Fale sempre em MT.
    Responda em Markdown.
  `;

  try {
    const contents = [
      { role: 'user', parts: [{ text: `Olá Finmo, aqui está meu contexto financeiro atual: ${context}` }] },
      { role: 'model', parts: [{ text: "Tudo bem! Recebi seus dados. Sou o Finmo, seu assessor financeiro. Como posso te ajudar hoje?" }] },
      ...history.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents
    });

    return result.text;
  } catch (error) {
    console.error("Erro no chat do Mentor:", error);
    return "Desculpa, tive um pequeno problema técnico ao processar isso.";
  }
};

export const getFinancialAdvice = async (
  stats: BudgetStats,
  transactions: Transaction[]
) => {
  if (!ai) {
    return {
      status: 'warning',
      message: 'Sistema de mentoria indisponível. Verifique sua chave API.',
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
    
    Lista de movimentações recentes (com justificativas do usuário):
    ${transactions.slice(0, 15).map(t => `- ${t.category === 'INCOME' ? 'ENTRADA' : 'SAÍDA'}: ${t.description} - ${t.amount} MT (${t.subcategory}) | Por quê: ${t.justification}`).join('\n')}

    Sua resposta deve ser em JSON seguindo este esquema:
    {
      "status": "good" | "warning" | "critical",
      "message": "Uma mensagem curta, pragmática e incentivadora.",
      "recommendations": ["Recomendação 1", "Recomendação 2", "Recomendação 3"],
      "habitsReport": {
        "triggers": [
          { "name": "Cansaço" | "Impulso" | "Social/Status" | "Trabalho" | "Necessidade Real", "total": 1500, "count": 3, "suggestion": "..." }
        ],
        "topBadHabit": "descrição do hábito repetitivo identificado",
        "savingsPotential": "valor estimado que seria economizado se o hábito fosse cortado em MT"
      }
    }

    Regras de Mentoria:
    1. Atue como Analista de Comportamento Financeiro.
    2. Analise as justificativas ("Por quê") e agrupe os gastos por "Gatilhos Emocionais" (Cansaço, Impulso, Social/Status, Trabalho, Necessidade Real).
    3. Identifique padrões de gastos emocionais ou por falta de planejamento.
    4. Se houver Renda Variável expressiva, sugira alocar 100% dela para a Reserva de Emergência ou Dívidas se o usuário estiver fora das metas.
    5. Se Necessidades + Dívidas > 50% da renda total, status é 'critical'.
    6. Fale sempre em Meticais (MT). Seja direto e encorajador.
    7. Dê conselhos comportamentais baseados no 'Por quê' para eliminar o desperdício.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["status", "message", "recommendations", "habitsReport"],
          properties: {
            status: { type: Type.STRING },
            message: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            habitsReport: {
              type: Type.OBJECT,
              required: ["triggers", "topBadHabit", "savingsPotential"],
              properties: {
                triggers: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ["name", "total", "count", "suggestion"],
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
          }
        }
      },
    });

    const text = response.text || '{}';
    // Remove potential markdown code blocks if they exist despite responseMimeType
    const cleanedText = text.replace(/```json\n?|```/g, '').trim();
    
    try {
      return JSON.parse(cleanedText);
    } catch (parseError) {
      console.warn("Retrying parse with regex extraction...");
      const match = cleanedText.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw parseError;
    }
  } catch (error) {
    console.error("Erro crítico na comunicação com Gemini:", error);
    return {
      status: 'warning',
      message: 'Houve um erro na análise, mas continue monitorando suas entradas variáveis para acelerar sua independência.',
      recommendations: ['Mantenha o registro de proveniência', 'Não gaste a renda extra antes de recebê-la', 'Foco na reserva']
    };
  }
};
