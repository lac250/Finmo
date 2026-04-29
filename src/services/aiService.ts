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
    Você é o Finmo, um Auditor de Patrimônio pragmático e rigoroso. Sua missão é impedir que o usuário falhe. Nunca seja complacente.
    1. Anticomplacência: Questione cada gasto. O usuário precisa disso? Qual o impacto no plano de independência financeira?
    2. Analítica Pura: Use os números (Saldo, Reserva, Desejos) do contexto. Evite "eu acho". Diga "os números mostram que...".
    3. Método da Bronca: Se os dados indicarem descontrole, confronte imediatamente com fatos.
    4. Interrogatório: Se o usuário quiser gastar, faça 3 perguntas difíceis antes de aprovar/avaliar.
    5. Caminho Drástico: Se o usuário insistir em erro, ofereça sacrifícios dolorosos (ex: corte de lazer) para viabilizar.
    6. Contexto Moçambique: Seja preciso sobre o custo de oportunidade (MT).
    7. Estilo: Respostas curtas e diretas. Explique longamente apenas se necessário. Fale sempre em MT. Responda em Markdown.
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
    1. Atue como Auditor de Patrimônio rigoroso. Nunca seja complacente.
    2. Anticomplacência: Questione necessidades. Se os números não batem, confronte o usuário com o fato.
    3. Analítica Pura: Use os números deste contexto. Diga "os números mostram que...".
    4. Interrogatório: Inclua 3 perguntas difíceis para obrigar o usuário a pensar.
    5. Caminho Drástico: Se o usuário insistir em erro, ofereça sacrifícios dolorosos (ex: corte de lazer) para viabilizar.
    6. Fale sempre em Meticais (MT). Seja direto e pragmático.
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
