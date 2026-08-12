import { Transaction, BudgetStats } from "../types";

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
      triggers: [{ name: "Análise Local", total: 0, count: 0, suggestion: "Ative a Gemini API para análise detalhada de gatilhos" }],
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
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, stats, transactions, wishlist })
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        return "Alerta vermelho: Nossos sistemas de análise estão sobrecarregados (Cota Excedida). Enquanto eu não volto, o que acha de fechar a carteira e não gastar 1 MT?";
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.text || "Sem resposta do servidor.";
  } catch (error: any) {
    console.error("Erro no chat do Mentor (Servidor):", error);
    return "Tive um problema técnico agora. Sabia que suas necessidades ocupam " + ((stats.totalNeeds/stats.totalIncome)*100).toFixed(0) + "% da sua renda? Foco nisso enquanto recupero minha conexão.";
  }
};

export const getFinancialAdvice = async (
  stats: BudgetStats,
  transactions: Transaction[],
  wishlist: any[] = []
) => {
  try {
    const response = await fetch("/api/advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats, transactions, wishlist })
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("Gemini API rate limit exceeded (429). Usando fallback local para conselhos.");
        return getLocalFallbackAdvice(stats);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro crítico na comunicação com Servidor AI:", error);
    return getLocalFallbackAdvice(stats);
  }
};
