import Groq from "groq-sdk";
import { Transaction, BudgetStats } from "../types";

const apiKey = import.meta.env.VITE_GROQ_API_KEY;

let groq: Groq | null = null;

try {
  if (apiKey) {
    groq = new Groq({ 
        apiKey,
        dangerouslyAllowBrowser: true // Allowed for prototype/demo apps in AI Studio
    });
  } else {
    console.warn("VITE_GROQ_API_KEY missing. Advice features will not work.");
  }
} catch (e) {
  console.error("Groq Initialization failed:", e);
}

const MODEL = "llama-3.3-70b-versatile";

/**
 * Fallback logic for when AI fails - uses 50/30/20 math to provide basic advice
 */
const getLocalFallbackAdvice = (stats: BudgetStats) => {
  const needsPercent = (stats.totalNeeds / stats.totalIncome) * 100;
  const wantsPercent = (stats.wants / stats.totalIncome) * 100;
  
  let status: 'good' | 'warning' | 'critical' = 'good';
  let message = "Seus números estão equilibrados! Continue assim.";
  const recommendations = ["Mantenha o registro de todos os gastos", "Revise sua reserva mensal"];

  if (needsPercent > 55) {
    status = 'critical';
    message = "ALERTA: Suas necessidades básicas estão consumindo demais sua renda.";
    recommendations.push("Identifique gastos fixos que podem ser renegociados");
  } else if (wantsPercent > 35) {
    status = 'warning';
    message = "Cuidado com os desejos: você está ultrapassando o limite de 30% em lazer.";
    recommendations.push("Tente reduzir pequenos gastos por impulso na próxima semana");
  }

  return {
    status,
    message,
    recommendations,
    habitsReport: {
      triggers: [{ name: "Análise Local", total: 0, count: 0, suggestion: "Ative a Groq API para análise detalhada de gatilhos" }],
      topBadHabit: "Aguardando conexão com IA",
      savingsPotential: "A calcular"
    }
  };
};

export const getChatResponse = async (
  message: string,
  history: { role: 'user' | 'model', text: string }[],
  stats: BudgetStats,
  transactions: Transaction[],
  wishlist: any[] = []
) => {
  if (!groq) return "Sistema de chat em modo offline. Por favor, adicione sua VITE_GROQ_API_KEY no .env";

  const context = `
    Contexto Financeiro Atual (Meticais - MT):
    - Salário Total: ${stats.totalIncome} MT
    - Economia/Reserva Atual: ${stats.savings} MT
    - Total Gasto: ${stats.totalSpent} MT
    - Necessidades: ${stats.totalNeeds + stats.debtInterest + stats.debtNoInterest} MT
    - Desejos (Wants): ${stats.wants} MT
    - Dívidas: ${stats.debtInterest + stats.debtNoInterest} MT

    Lista de Desejos (Wishlist):
    ${wishlist.map(i => `- ${i.name}: ${i.price} MT (Prioridade ${i.priority})`).join('\n')}

    Últimas 10 transações e justificativas ('Por quê'):
    ${transactions.slice(-10).map(t => `- ${t.description}: ${t.amount} MT (Motivo: ${t.justification})`).join('\n')}

    Diretrizes de Personalidade:
    Você é um "Sargento" auditor de patrimônio pragmático e rigoroso. Sua missão é impedir sua ruína financeira.
    1. ANTICOMPLACÊNCIA: Nunca dê razão por impulso. Questione a necessidade real e o impacto no futuro. Se o usuário insistir em erro, ofereça o "Caminho Drástico" (ex: corte de 100% de lazer).
    2. MÉTODO DA BRONCA: Confronte descontrole imediatamente com fatos. Sem rodeios.
    3. FATOS: Use os números do dashboard (Saldo, Reserva, Desejos). Diga "os números mostram...".
    4. INTERROGATÓRIO: Faça APENAS 1 pergunta difícil por vez. Nunca liste várias juntas.
    5. LIMITES: Máximo 140 caracteres per resposta. Máximo 3 frases. Sem cabeçalhos.
    6. ESTILO: Fale em MT. Responda em Markdown. Seja seco, bruto e factual.
  `;

  try {
    const messages = [
      { role: "system" as const, content: context },
      ...history.map(m => ({
        role: (m.role === 'model' ? 'assistant' : 'user') as "user" | "assistant",
        content: m.text
      })),
      { role: "user" as const, content: message }
    ];

    const completion = await groq.chat.completions.create({
      messages,
      model: MODEL,
      temperature: 0.7,
      max_tokens: 1000
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error: any) {
    console.error("Erro no chat do Mentor (Groq):", error);
    if (error?.status === 401) return "ERRO_AUTH: Sua chave API da Groq parece inválida. Verifique os segredos do app.";
    return "Tive um problema técnico na Groq agora. Sabia que suas necessidades ocupam " + ((stats.totalNeeds/stats.totalIncome)*100).toFixed(0) + "% da sua renda? Foco nisso enquanto recupero minha conexão.";
  }
};

export const getFinancialAdvice = async (
  stats: BudgetStats,
  transactions: Transaction[],
  wishlist: any[] = []
) => {
  if (!groq) return getLocalFallbackAdvice(stats);

  const prompt = `
    Atue como Finmo, um mentor financeiro especializado na regra 50/30/20. 
    Analise os seguintes dados financeiros do usuário (Moeda: Metical - MT):
    
    Renda Total Disponível: ${stats.totalIncome} MT (Base: ${stats.baseIncome} + Variável: ${stats.variableIncome})
    
    Gastos em Necessidades (Meta 50% de ${stats.totalIncome}): ${stats.totalNeeds + stats.debtInterest + stats.debtNoInterest} MT
    Dívidas Ativas: ${stats.debtInterest + stats.debtNoInterest} MT
    Gastos em Desejos (Meta 30% de ${stats.totalIncome}): ${stats.wants} MT
    Investimentos/Reserva (Meta 20% de ${stats.totalIncome}): ${stats.savings} MT

    LISTA DE DESEJOS (Wishlist):
    ${wishlist.map(i => `- ${i.name}: ${i.price} MT (Prioridade ${i.priority}: ${i.justification})`).join('\n')}
    
    Lista de movimentações recentes com foco em JUSTIFICATIVAS:
    ${transactions.slice(0, 15).map(t => `- ${t.description}: ${t.amount} MT | Por quê: ${t.justification}`).join('\n')}

    Instruções de análise:
    1. Analise o campo "Por quê" para identificar gatilhos de gastos.
    2. Use a lógica de prioridades (Necessidades > Economia > Desejos).
    3. Identifique se o usuário está sendo honesto consigo mesmo nas justificativas.
    
    Retorne a resposta EXCLUSIVAMENTE como um JSON no formato:
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
    1. Atue como Auditor de Patrimônio rigoroso e pragmático ("Sargento").
    2. ANTICOMPLACÊNCIA: Questione necessidades. Se os números não batem, confronte o usuário com o fato.
    3. ANALÍTICA: Baseie-se apenas em fatos/números. Diga "os números mostram...".
    4. CAMINHO DRÁSTICO: Se o usuário insistir em erro, ofereça um sacrifício direto (ex: cortar 100% de lazer).
    5. LIMITES: APENAS 1 pergunta difícil por vez. Máximo 140 caracteres por campo. Sem resumos/cabeçalhos.
    6. Fale sempre em MT.
  `;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Você é um mentor financeiro que responde apenas em JSON." },
        { role: "user", content: prompt }
      ],
      model: MODEL,
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const text = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro crítico na comunicação com Groq:", error);
    return getLocalFallbackAdvice(stats);
  }
};
