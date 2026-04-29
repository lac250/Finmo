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

export const getChatResponse = async (
  message: string,
  history: { role: 'user' | 'model', text: string }[],
  stats: BudgetStats,
  transactions: Transaction[],
  wishlist: any[] = []
) => {
  if (!groq) return "Sistema de chat indisponível no momento.";

  const context = `
    Contexto Financeiro Atual (Meticais - MT):
    - Salário Total: ${stats.totalIncome} MT
    - Economia/Reserva Atual: ${stats.savings} MT
    - Total Gasto: ${stats.totalSpent} MT
    - Necessidades: ${stats.totalNeeds + stats.debtInterest + stats.debtNoInterest} MT
    - Desejos (Wants): ${stats.wants} MT
    - Dívidas: ${stats.debtInterest + stats.debtNoInterest} MT

    Lista de Desejos (Wishlist):
    ${wishlist.map(i => `- ${i.name}: ${i.price} MT (Prioridade ${i.priority}: ${i.justification})`).join('\n')}

    Últimas 10 transações e justificativas ('Por quê'):
    ${transactions.slice(-10).map(t => `- ${t.description}: ${t.amount} MT (Motivo: ${t.justification})`).join('\n')}

    Diretrizes de Personalidade:
    Você é o Finmo, um mentor financeiro moçambicano que analisa profundamente a justificativa emocional dos gastos.
    Se o usuário gasta por "impulso" ou "cansaço", seja firme mas empático.
    Use os motivos ('Por quê') para dar conselhos comportamentais.
    Fale sempre em MT. Responda em Markdown.
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
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Erro no chat do Mentor (Groq):", error);
    return "Desculpa, tive um pequeno problema técnico ao processar isso com Groq.";
  }
};

export const getFinancialAdvice = async (
  stats: BudgetStats,
  transactions: Transaction[],
  wishlist: any[] = []
) => {
  if (!groq) {
    return {
      status: 'warning',
      message: 'Sistema de mentoria indisponível. Verifique sua chave API Groq.',
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

    LISTA DE DESEJOS (Wishlist):
    ${wishlist.map(i => `- ${i.name}: ${i.price} MT (Prioridade ${i.priority}: ${i.justification})`).join('\n')}
    
    Lista de movimentações recentes com foco em JUSTIFICATIVAS:
    ${transactions.slice(0, 15).map(t => `- ${t.description}: ${t.amount} MT | Por quê: ${t.justification}`).join('\n')}

    Instruções de análise:
    1. Analise o campo "Por quê" para identificar gatilhos de gastos (ex: se muitos gastos têm justificativa de "cansaço", a sugestão deve focar em descanso não-pago).
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
    1. Atue como Analista de Comportamento Financeiro.
    2. Analise as justificativas ("Por quê") e agrupe os gastos por "Gatilhos Emocionais" (Cansaço, Impulso, Social/Status, Trabalho, Necessidade Real).
    3. Identifique padrões de gastos emocionais ou por falta de planejamento.
    4. Se Necessidades + Dívidas > 50% da renda total, status é 'critical'.
    5. Fale sempre em Meticais (MT). Seja direto e encorajador.
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
    return {
      status: 'warning',
      message: 'Houve um erro na análise via Groq, mas continue monitorando suas entradas.',
      recommendations: ['Mantenha o registro de proveniência', 'Não gaste a renda extra antes de recebê-la', 'Foco na reserva']
    };
  }
};
