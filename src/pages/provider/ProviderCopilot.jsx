import { useState, useEffect, useRef, useMemo } from 'react';
import { computeTrustScore, optimizeSchedule, predictRepeatBookings, TRUST_TIER_STYLE } from '@/lib/ai/engine';
import { Send, Bot, User, Sparkles, Loader2, TrendingUp, CalendarDays, DollarSign, ArrowRight, CheckCircle, AlertTriangle, RefreshCw, Cpu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format, subDays, startOfMonth } from 'date-fns';
import { chatOpenRouter as chatDeepSeek, isConfigured } from '@/lib/openrouter';

const QUICK_PROMPTS = [
    'What should I prioritize today to maximize earnings?',
    'How can I improve my trust score?',
    'Which time slots get the most bookings?',
    'How am I performing compared to last month?',
    'Give me tips to reduce cancellations.',
    'What services should I add to grow revenue?',
    'How should I price my services competitively?',
    'Create a 30-day growth plan for my business.',
];

function MessageBubble({ msg }) {
    const isUser = msg.role === 'user';
    return (
        <div className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                style={isUser
                    ? { background: 'var(--color-primary)' }
                    : { background: 'linear-gradient(135deg, #7c6fcd, #a855f7)' }}>
                {isUser
                    ? <User className="h-4 w-4" style={{ color: 'var(--color-on-primary)' }} />
                    : <Bot className="h-4 w-4 text-white" />}
            </div>
            <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                style={isUser
                    ? { background: 'var(--color-primary)', color: 'var(--color-on-primary)', borderTopRightRadius: 4 }
                    : { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderTopLeftRadius: 4 }}>
                {isUser
                    ? <p>{msg.content}</p>
                    : <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                        style={{ color: 'var(--color-text)' }}>
                        {msg.content}
                    </ReactMarkdown>}
                {!isUser && (
                    <p className="text-[9px] mt-2 font-mono opacity-40" style={{ color: 'var(--color-text-subtle)' }}>
                        SIMON COPILOT · TRUVORNEX
                    </p>
                )}
            </div>
        </div>
    );
}

function TypingIndicator() {
    return (
        <div className="flex gap-3 items-start">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c6fcd, #a855f7)' }}>
                <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-1">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="h-1.5 w-1.5 rounded-full"
                            style={{ background: 'var(--color-text-subtle)', animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function ProviderCopilot() {
    const [provider, setProvider] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [dataLoading, setDataLoading] = useState(true);
    const bottomRef = useRef(null);

    useEffect(() => {
        setProvider(null);
        setBookings([]);
        setDataLoading(false);
    }, []);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading, streamingContent]);

    const metrics = useMemo(() => {
        if (!provider) return null;
        const trust = computeTrustScore(provider, bookings);
        const { schedule, suggestions } = optimizeSchedule(bookings);
        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const monthRevenue = bookings.filter(b => b.status === 'completed' && b.date >= monthStart).reduce((s, b) => s + (b.price || 0), 0);
        const totalRevenue = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.price || 0), 0);
        const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        const weekBookings = bookings.filter(b => b.date >= weekAgo).length;
        return { trust, schedule: schedule.slice(0, 5), suggestions, monthRevenue, totalRevenue, weekBookings };
    }, [provider, bookings]);

    const buildSystemPrompt = () => {
        const ts = metrics?.trust;
        return `You are the AI Business Copilot for ${provider?.business_name || 'a Truvornex provider'}.

Provider profile:
- Business: ${provider?.business_name || 'Not set up yet'}
- Rating: ${provider?.rating?.toFixed(1) || 'N/A'}/5.0 (${provider?.review_count || 0} reviews)
- Verified: ${provider?.verified ? 'Yes' : 'No'}
- Trust Score: ${ts?.score || 'N/A'}/100 (${ts?.label || 'N/A'})
- Completion Rate: ${ts?.completionRate || 0}%

Business metrics:
- Total bookings: ${bookings.length}
- This month revenue: $${metrics?.monthRevenue?.toFixed(0) || 0}
- Total revenue: $${metrics?.totalRevenue?.toFixed(0) || 0}
- Bookings this week: ${metrics?.weekBookings || 0}
- Schedule optimizations: ${metrics?.suggestions?.map(s => s.message).join('; ') || 'none'}
- Upcoming jobs: ${metrics?.schedule?.map(b => `${b.service_name} on ${b.date}`).join(', ') || 'none'}

You are a proactive, data-driven business advisor. Give specific, numbered action steps. Use markdown. Focus on revenue growth, efficiency, and customer satisfaction.`;
    };

    const send = async (text) => {
        const content = text || input.trim();
        if (!content || loading) return;
        setInput('');

        const newMsg = { role: 'user', content };
        const history = [...messages, newMsg];
        setMessages(history);
        setLoading(true);
        setStreamingContent('');

        if (!isConfigured()) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '**Simon Copilot needs OpenRouter configured.** Add `OPENROUTER_API_KEY` to your environment variables to activate AI responses.',
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
                maxTokens: 1500,
                onChunk: (delta, acc) => {
                    full = acc;
                    setStreamingContent(acc);
                },
            });
            setMessages(prev => [...prev, { role: 'assistant', content: full }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${e.message}` }]);
        }
        setLoading(false);
        setStreamingContent('');
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
                            <h1 className="font-bold text-base tracking-tight" style={{ color: 'var(--color-primary)' }}>
                                Simon Copilot
                            </h1>
                            <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px]" style={{ color: 'var(--color-text-subtle)' }}>OpenRouter · Live</span>
                            </span>
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                            Your AI business advisor · {isConfigured() ? 'Ready' : 'API key required'}
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

            {/* Chat area */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5 min-h-0">
                {!hasMessages && (
                    <div className="pt-6 pb-4">
                        <div className="text-center mb-6">
                            <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                                style={{ background: 'linear-gradient(135deg, rgba(124,111,205,0.2), rgba(168,85,247,0.15))', border: '1px solid rgba(124,111,205,0.3)' }}>
                                <Sparkles className="h-6 w-6" style={{ color: '#7c6fcd' }} />
                            </div>
                            <h2 className="font-bold text-base mb-1" style={{ color: 'var(--color-primary)' }}>
                                Hi, I'm Simon Copilot
                            </h2>
                            <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                                Your AI business advisor. Ask me anything about growing your provider business.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {QUICK_PROMPTS.map(prompt => (
                                <button key={prompt} onClick={() => send(prompt)} disabled={dataLoading || loading}
                                    className="flex items-center gap-2.5 p-3 rounded-xl text-left text-xs transition-all group"
                                    style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
                                    <ArrowRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--color-accent)' }} />
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                {loading && !streamingContent && <TypingIndicator />}
                {loading && streamingContent && (
                    <div className="flex gap-3 items-start">
                        <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'linear-gradient(135deg, #7c6fcd, #a855f7)' }}>
                            <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderTopLeftRadius: 4 }}>
                            <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                {streamingContent}
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
                        type="text" value={input} onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                        placeholder="Ask Simon anything about your business…"
                        disabled={dataLoading || loading}
                        className="flex-1 h-9 bg-transparent text-sm focus:outline-none px-2"
                        style={{ color: 'var(--color-primary)' }}
                    />
                    <button onClick={() => send()} disabled={!input.trim() || loading || dataLoading}
                        className="h-9 w-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-40"
                        style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </button>
                </div>
                <p className="text-center text-[9px] mt-2 tracking-widest" style={{ color: 'var(--color-text-subtle)' }}>
                    SIMON AI · TRUVORNEX PROVIDER COPILOT · OPENROUTER
                </p>
            </div>
        </div>
    );
}
