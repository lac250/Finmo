import React, { useState, useEffect, useRef } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { getFinancialAdvice, getChatResponse } from '../services/aiService';
import { AIAdvice } from '../types';
import { 
    BrainCircuitIcon, 
    SparklesIcon, 
    AlertTriangleIcon, 
    CheckCircle2Icon, 
    Loader2Icon, 
    MessageSquareIcon, 
    SendIcon, 
    XIcon,
    UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

const Mentor: React.FC = () => {
    const { stats, transactions, wishlist } = useFinancial();
    const [advice, setAdvice] = useState<AIAdvice | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Chat states
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages, isTyping]);

    const fetchAdvice = async () => {
        if (!stats) return;
        setLoading(true);
        try {
            const res = await getFinancialAdvice(stats, transactions, wishlist);
            setAdvice(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || !stats || isTyping) return;

        const newUserMessage = { role: 'user' as const, text: userInput };
        setChatMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setIsTyping(true);

        try {
            const response = await getChatResponse(userInput, chatMessages, stats, transactions, wishlist);
            setChatMessages(prev => [...prev, { role: 'model', text: response }]);
        } catch (error) {
            console.error("Chat error:", error);
            setChatMessages(prev => [...prev, { role: 'model', text: "Opa, tive um problema aqui. Podes repetir?" }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-20">
            <header className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                    <BrainCircuitIcon className="w-4 h-4" /> AI Powered Mentor
                </div>
                <h1 className="text-4xl font-black text-white">Conselheiro Finmo</h1>
                <p className="text-slate-400">Análise profunda do seu comportamento financeiro com recomendações acionáveis.</p>
            </header>

            {!isChatOpen ? (
                <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <BrainCircuitIcon className="w-32 h-32" />
                    </div>
                    
                    <AnimatePresence mode="wait">
                        {!advice && !loading ? (
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }}
                                className="text-center space-y-6 py-12"
                            >
                                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto">
                                    <SparklesIcon className="w-10 h-10 text-slate-600" />
                                </div>
                                <p className="text-slate-500 max-w-xs mx-auto">Receba uma análise automatizada ou converse diretamente comigo sobre seus planos.</p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <button 
                                        onClick={fetchAdvice}
                                        className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition-all shadow-lg active:scale-95"
                                    >
                                        Pedir Conselho
                                    </button>
                                    <button 
                                        onClick={() => setIsChatOpen(true)}
                                        className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all border border-white/5 flex items-center justify-center gap-2"
                                    >
                                        <MessageSquareIcon className="w-4 h-4" /> Conversar com Finmo
                                    </button>
                                </div>
                            </motion.div>
                        ) : loading ? (
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }}
                                className="text-center py-20 space-y-4"
                            >
                                <Loader2Icon className="w-12 h-12 text-emerald-500 animate-spin mx-auto" />
                                <p className="text-slate-400 animate-pulse font-medium">Analisando transações e fluxos...</p>
                            </motion.div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className={`p-4 rounded-2xl flex items-start gap-4 ${
                                    advice?.status === 'critical' ? 'bg-red-500/10 border border-red-500/20' :
                                    advice?.status === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' :
                                    'bg-emerald-500/10 border border-emerald-500/20'
                                }`}>
                                    {advice?.status === 'critical' ? <AlertTriangleIcon className="w-6 h-6 text-red-500" /> :
                                     advice?.status === 'warning' ? <AlertTriangleIcon className="w-6 h-6 text-amber-500" /> :
                                     <CheckCircle2Icon className="w-6 h-6 text-emerald-500" />}
                                    <div>
                                        <h3 className="font-bold text-white text-lg">Status do Mês</h3>
                                        <p className="text-slate-300 leading-relaxed">{advice?.message}</p>
                                    </div>
                                </div>

                                {advice?.habitsReport && (
                                    <div className="space-y-6 pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <SparklesIcon className="w-4 h-4 text-emerald-500" />
                                            <h4 className="text-sm font-black text-white uppercase tracking-widest">Raio-X de Hábitos</h4>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            {advice.habitsReport.triggers.map((trigger, i) => (
                                                <div key={i} className="p-4 bg-slate-800/30 rounded-2xl border border-white/5 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">{trigger.name}</span>
                                                        <span className="text-xs font-bold text-white">{trigger.total.toLocaleString()} MT ({trigger.count}x)</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 leading-relaxed">{trigger.suggestion}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                            <div className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-1">Destaque Negativo</div>
                                            <p className="text-xs text-white leading-relaxed mb-2">{advice.habitsReport.topBadHabit}</p>
                                            <div className="pt-2 border-t border-emerald-500/10">
                                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Potencial de Economia: </span>
                                                <span className="text-xs font-black text-white">{advice.habitsReport.savingsPotential}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Próximos Passos</h4>
                                    <div className="grid gap-3">
                                        {advice?.recommendations.map((rec, i) => (
                                            <motion.div 
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="p-4 bg-slate-800/30 rounded-2xl border border-white/5 flex items-center gap-3"
                                            >
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <p className="text-sm text-slate-300">{rec}</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 pt-4">
                                    <button 
                                        onClick={() => setIsChatOpen(true)}
                                        className="w-full py-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <MessageSquareIcon className="w-4 h-4" /> Conversar sobre estes pontos
                                    </button>
                                    <button 
                                        onClick={() => setAdvice(null)}
                                        className="w-full py-2 text-slate-600 text-xs font-bold hover:text-slate-400 transition-colors"
                                    >
                                        Ver outras análises
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass flex flex-col h-[600px] rounded-[2.5rem] overflow-hidden border-white/10"
                >
                    <header className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                                <BrainCircuitIcon className="w-6 h-6 text-slate-950" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Chat com Finmo</h3>
                                <p className="text-[10px] text-emerald-500 font-medium">Online e analisando seus dados</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsChatOpen(false)}
                            className="p-2 hover:bg-white/10 rounded-full text-slate-400"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                                <BrainCircuitIcon className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-2xl rounded-tl-none border border-white/5 max-w-[85%]">
                                <p className="text-sm text-slate-300">Olá! Sou o Finmo. Já conheço o teu saldo e os teus gastos deste mês. Que ideia tens em mente? Queres falar sobre uma compra, uma dívida ou como poupar mais?</p>
                            </div>
                        </div>

                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-500/20' : 'bg-emerald-500/20'}`}>
                                    {msg.role === 'user' ? <UserIcon className="w-4 h-4 text-blue-400" /> : <BrainCircuitIcon className="w-4 h-4 text-emerald-500" />}
                                </div>
                                <div className={`p-4 rounded-2xl border border-white/5 max-w-[85%] ${msg.role === 'user' ? 'bg-blue-500/10 rounded-tr-none text-right' : 'bg-slate-800/50 rounded-tl-none text-left'}`}>
                                    <div className="text-sm text-slate-300 prose prose-invert prose-xs">
                                        <Markdown>{msg.text}</Markdown>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                                    <BrainCircuitIcon className="w-4 h-4 text-emerald-500 animate-pulse" />
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-2xl rounded-tl-none border border-white/5">
                                    <div className="flex gap-1">
                                        <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" />
                                        <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-slate-900/50">
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Tire uma dúvida financeira..."
                                className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                            />
                            <button 
                                type="submit"
                                disabled={!userInput.trim() || isTyping}
                                className="w-12 h-12 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95"
                            >
                                <SendIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}
        </div>
    );
};

export default Mentor;
