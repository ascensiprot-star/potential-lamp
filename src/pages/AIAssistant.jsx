import { useState, useEffect, useRef } from 'react';
import { predictRepeatBookings } from '@/lib/ai/engine';
import { chatOpenRouter as chatDeepSeek, isConfigured } from '@/lib/openrouter';
import {
    Send, Sparkles, User, Loader2, MapPin, CalendarDays,
    Zap, TrendingUp, Search, Clock, ArrowRight, Cpu, RefreshCw,
    Lightbulb, BarChart2, ShieldCheck, Package, MessageSquare, Bot
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
    { icon: Search, label: 'Best provider near me', prompt: 'Which providers should I book? Show me the best options near me with ratings and availability.' },
    { icon: TrendingUp, label: 'What to book this month', prompt: 'Based on the season and my area, what services should I be booking this month? Be specific.' },
    { icon: CalendarDays, label: 'Schedule recurring cleaning', prompt: 'Help me set up a recurring house cleaning schedule. What would you recommend for my area?' },
    { icon: Zap, label: 'Urgent service needed', prompt: 'I need urgent help — what providers can come quickest? Show availability.' },
    { icon: MapPin, label: 'Trending in my area', prompt: 'What services are most in demand in my neighborhood right now? Show demand data.' },
    { icon: Clock, label: 'Predict my next booking', prompt: 'Based on my booking history, when do you think I will need my next service and what will it be?' },
    { icon: Lightbulb, label: 'AI home maintenance plan', prompt: 'Create a complete AI-powered home maintenance plan for the next 3 months based on my area and season.' },
    { icon: BarChart2, label: 'Neighborhood service gaps', prompt: 'What service gaps exist in my neighborhood? Where is demand high but supply low?' },
    { icon: ShieldCheck, label: 'Best verified providers', prompt: 'Who are the most trusted and verified providers on the platform? Show me their ratings and reviews.' },
    { icon: Package, label: 'Bundle deals available', prompt: 'What bundle deals are currently forming? How much can I save by joining a group booking?' },
    { icon: MessageSquare, label: 'Complaint resolution', prompt: 'I had an issue with a recent booking. How can I resolve it and what are my options?' },
    { icon: Cpu, label: 'Optimize my schedule', prompt: 'Analyze my booking patterns and suggest how to optimize my home service schedule for cost and efficiency.' },
];

const MODES = [
    { id: 'assistant', label: 'Assistant', icon: Cpu, desc: 'General help & recommendations' },
    { id: 'planner', label: 'Planner', icon: CalendarDays, desc: 'Schedule & recurring services' },
    { id: 'analyst', label: 'Analyst', icon: BarChart2, desc: 'Neighborhood insights & trends' },
    { id: 'advisor', label: 'Advisor', icon: Lightbulb, desc: 'Cost optimization & savings' },
];

function TypingIndicator() {
    return (
        <div className="flex gap-3 items-start">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(124,111,205,0.2), rgba(168,85,247,0.15))', border: '1px solid rgba(124,111,205,0.3)' }}>
                <Sparkles className="h-3.5 w-3.5" style={{ color: '#7c6fcd' }} />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-1">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="h-1.5 w-1.5 rounded-full"
                            style={{ background: 'var(--color-text-subtle)', animation: `simonBounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function MessageBubble({ msg }) {
    const isUser = msg.role === 'user';
    return (
        <div className={`flex gap-2.5 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                style={isUser
                    ? { background: 'var(--color-primary)', border: '1px solid var(--color-primary)' }
                    : { background: 'linear-gradient(135deg, rgba(124,111,205,0.2), rgba(168,85,247,0.15))', border: '1px solid rgba(124,111,205,0.3)' }}>
                {isUser
                    ? <User className="h-3.5 w-3.5" style={{ color: 'var(--color-on-primary)' }} strokeWidth={2} />
                    : <Sparkles className="h-3.5 w-3.5" style={{ color: '#7c6fcd' }} strokeWidth={1.8} />}
            </div>
            <div className="max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                style={isUser
                    ? { background: 'var(--color-primary)', color: 'var(--color-on-primary)', borderTopRightRadius: 4 }
                    : { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderTopLeftRadius: 4 }}>
                {isUser ? (
                    <p>{msg.content}</p>
                ) : (
                    <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                        style={{ color: 'var(--color-text)' }}>
                        {msg.content}
                    </ReactMarkdown>
                )}
                {!isUser && (
                    <p className="text-[9px] mt-2 opacity-40 font-mono" style={{ color: 'var(--color-text-subtle)' }}>
                        SIMON · TRUVORNEX · OPENROUTER
                    </p>
                )}
            </div>
        </div>
    );
}

export default function AIAssistant() {
    const [messages, setMessages] = useState([]);
    const [streamingMsg, setStreamingMsg] = useState('');
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [contextLoaded, setContextLoaded] = useState(false);
    const [context, setContext] = useState({});
    const [mode, setMode] = useState('assistant');
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            try {
                const me = null, categories = [], providers = [], bookings = [];
                const repeatPredictions = predictRepeatBookings([]);
                setContext({ me, categories, providers, userBookings: [], allBookings: bookings, repeatPredictions });
            } catch (_) { }
            setContextLoaded(true);
        };
        load();
    }, []);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading, streamingMsg]);

    const getModePersonality = () => ({
        assistant: 'You are a helpful, friendly AI assistant focused on connecting users with the right services and providers.',
        planner: 'You are a strategic planning AI. Focus on scheduling, recurring services, calendar optimization, and long-term home maintenance plans.',
        analyst: 'You are a data analyst AI. Focus on neighborhood trends, demand/supply analysis, service gaps, pricing analytics, and market intelligence.',
        advisor: 'You are a financial advisor AI specializing in home services. Focus on cost optimization, bundle deals, savings opportunities, and budget planning.',
    }[mode] || '');

    const buildSystemPrompt = () => {
        const { me, categories, providers, userBookings, repeatPredictions } = context;
        const month = new Date().toLocaleString('default', { month: 'long' });
        const completed = userBookings?.filter(b => b.status === 'completed') || [];
        return `You are Simon — the AI intelligence engine powering Truvornex, an advanced neighborhood services super-app.
${getModePersonality()}
Mode: ${mode.toUpperCase()} | Month: ${month}
User: ${me?.full_name || 'Guest'} (${me?.email || 'not logged in'})
Booking history (${completed.length} completed): ${completed.slice(0, 10).map(b => `${b.service_name} on ${b.date}`).join(', ') || 'none'}
Predictions: ${repeatPredictions?.slice(0, 5).map(p => `${p.service} in ~${p.daysUntil} days`).join(', ') || 'insufficient data'}
Platform: ${providers?.length || 0} providers across 12 categories
Categories: Cleaning, Plumbing, Electrical, Moving, Beauty, Chef, Fitness, Tutoring, Pet Care, Photography, Tech, Gardening
Be precise, data-driven, use markdown formatting with headers and bullet points. Always end complex responses with a "**Next Step:**" section.`;
    };

    const send = async (text) => {
        const content = text || input.trim();
        if (!content || loading) return;
        setInput('');
        const newMsg = { role: 'user', content };
        const history = [...messages, newMsg];
        setMessages(history);
        setLoading(true);
        setStreamingMsg('');

        if (!isConfigured()) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '**Simon needs OpenRouter to be configured.** Your `OPENROUTER_API_KEY` secret powers this AI. Add it in your environment variables and restart the server.',
            }]);
            setLoading(false);
            return;
        }

        try {
            let full = '';
            await chatDeepSeek({
                messages: history.map(m => ({ role: m.role, content: m.content })),
                systemPrompt: buildSystemPrompt(),
                temperature: 0.7,
                maxTokens: 1800,
                onChunk: (delta, acc) => {
                    full = acc;
                    setStreamingMsg(acc);
                },
            });
            setMessages(prev => [...prev, { role: 'assistant', content: full }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: `**Simon encountered an error:** ${e.message}` }]);
        }
        setLoading(false);
        setStreamingMsg('');
    };

    const hasMessages = messages.length > 0;

    return (
        <div className="flex flex-col h-[calc(100vh-7rem)] max-h-[900px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, rgba(124,111,205,0.2), rgba(168,85,247,0.15))', border: '1px solid rgba(124,111,205,0.3)' }}>
                        <Sparkles className="h-4 w-4" style={{ color: '#7c6fcd' }} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-bold text-base tracking-tight" style={{ color: 'var(--color-primary)' }}>Simon AI</h1>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md tracking-wider uppercase"
                                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-subtle)' }}>
                                {isConfigured() ? 'OpenRouter' : 'Demo'}
                            </span>
                            <span className="flex items-center gap-1">
                                <span className={`h-1.5 w-1.5 rounded-full ${isConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                                <span className="text-[9px]" style={{ color: 'var(--color-text-subtle)' }}>
                                    {isConfigured() ? 'Online' : 'Demo'}
                                </span>
                            </span>
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                            {MODES.find(m2 => m2.id === mode)?.desc}
                        </p>
                    </div>
                </div>
                {hasMessages && (
                    <button onClick={() => setMessages([])}
                        className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                        style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-subtle)' }}>
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* Mode selector */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-0.5 shrink-0">
                {MODES.map(m => (
                    <button key={m.id} onClick={() => setMode(m.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
                        style={mode === m.id
                            ? { background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: '1px solid var(--color-primary)' }
                            : { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                        <m.icon className="h-3 w-3" strokeWidth={1.8} />{m.label}
                    </button>
                ))}
            </div>

            {/* Chat area */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5 min-h-0">
                {!hasMessages && (
                    <div className="text-center pt-8 pb-4">
                        <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                            style={{ background: 'linear-gradient(135deg, rgba(124,111,205,0.2), rgba(168,85,247,0.15))', border: '1px solid rgba(124,111,205,0.3)' }}>
                            <Sparkles className="h-6 w-6" style={{ color: '#7c6fcd' }} />
                        </div>
                        <h2 className="font-bold text-base mb-1" style={{ color: 'var(--color-primary)' }}>Hello, I'm Simon.</h2>
                        <p className="text-xs max-w-xs mx-auto mb-5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                            {isConfigured()
                                ? 'Powered by OpenRouter · Ask me anything about services, providers, or your neighborhood'
                                : 'Demo mode — add OPENROUTER_API_KEY to unlock full AI'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto text-left">
                            {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                                <button key={label} onClick={() => send(prompt)} disabled={!contextLoaded}
                                    className="flex items-center gap-2.5 p-3 rounded-xl transition-all text-left group"
                                    style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
                                    <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                                        style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-high)' }}>
                                        <Icon className="h-3.5 w-3.5" style={{ color: 'var(--color-text-subtle)' }} strokeWidth={1.8} />
                                    </div>
                                    <span className="text-xs font-medium">{label}</span>
                                    <ArrowRight className="h-3 w-3 ml-auto shrink-0" style={{ color: 'var(--color-border-strong)' }} strokeWidth={1.8} />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                {loading && !streamingMsg && <TypingIndicator />}
                {loading && streamingMsg && (
                    <div className="flex gap-2.5 items-start">
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'linear-gradient(135deg, rgba(124,111,205,0.2), rgba(168,85,247,0.15))', border: '1px solid rgba(124,111,205,0.3)' }}>
                            <Sparkles className="h-3.5 w-3.5" style={{ color: '#7c6fcd' }} />
                        </div>
                        <div className="max-w-[82%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                            <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                {streamingMsg}
                            </ReactMarkdown>
                            <span className="inline-block h-3 w-0.5 ml-0.5 bg-current animate-pulse" />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 pt-3">
                <div className="flex items-center gap-2 rounded-xl p-2 transition-all"
                    style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={contextLoaded ? 'Ask Simon anything…' : 'Loading context…'}
                        className="flex-1 h-9 bg-transparent text-sm focus:outline-none px-2"
                        style={{ color: 'var(--color-primary)' }}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                        disabled={!contextLoaded}
                    />
                    <button onClick={() => send()} disabled={!input.trim() || loading || !contextLoaded}
                        className="h-9 w-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-40"
                        style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" strokeWidth={2} />}
                    </button>
                </div>
                <p className="text-center text-[9px] mt-2 tracking-widest" style={{ color: 'var(--color-text-subtle)' }}>
                    SIMON AI · TRUVORNEX INTELLIGENCE ENGINE · OPENROUTER
                </p>
            </div>

            <style>{`
                @keyframes simonBounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-5px); }
                }
            `}</style>
        </div>
    );
}
