import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Users, DollarSign, Star, Lightbulb, Loader2, RefreshCw, Cpu } from 'lucide-react';
import { chatOpenRouter as chatDeepSeek, isConfigured } from '@/lib/openrouter';
import ReactMarkdown from 'react-markdown';

const INSIGHT_TYPES = [
    {
        id: 'revenue',
        label: 'Revenue Optimization',
        icon: DollarSign,
        color: '#22c55e',
        prompt: (data) => `Analyze this service provider's data and give 5 specific revenue optimization strategies:
${JSON.stringify(data, null, 2)}
Focus on pricing, upselling, and capacity utilization. Include estimated revenue impact for each.`,
    },
    {
        id: 'customers',
        label: 'Customer Retention',
        icon: Users,
        color: '#7c6fcd',
        prompt: (data) => `Analyze booking patterns and give 5 customer retention strategies:
${JSON.stringify(data, null, 2)}
Focus on repeat customers, loyalty building, and reducing churn. Include specific action steps.`,
    },
    {
        id: 'pricing',
        label: 'Dynamic Pricing',
        icon: TrendingUp,
        color: '#f59e0b',
        prompt: (data) => `Suggest an optimal dynamic pricing strategy for this provider:
${JSON.stringify(data, null, 2)}
Give specific price points for peak/off-peak, seasonal adjustments, and bundle pricing.`,
    },
    {
        id: 'scheduling',
        label: 'Schedule Optimization',
        icon: Star,
        color: '#06b6d4',
        prompt: (data) => `Optimize this provider's schedule for maximum efficiency and earnings:
${JSON.stringify(data, null, 2)}
Recommend best working hours, slot intervals, day-of-week patterns, and how to reduce gaps.`,
    },
];

export default function AIInsights() {
    const [provider, setProvider] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [insights, setInsights] = useState({});
    const [streaming, setStreaming] = useState({});
    const [loading, setLoading] = useState({});
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        setProvider(null);
        setBookings([]);
        setPageLoading(false);
    }, []);

    const getInsight = async (type) => {
        if (!isConfigured()) {
            setInsights(i => ({ ...i, [type.id]: '**OpenRouter not configured** — Add `OPENROUTER_API_KEY` to unlock Simon AI insights.' }));
            return;
        }
        setLoading(l => ({ ...l, [type.id]: true }));
        setStreaming(s => ({ ...s, [type.id]: '' }));
        const data = {
            provider: { business_name: provider?.business_name || 'Demo Business', rating: provider?.rating || 4.5, city: provider?.city || 'Your City' },
            totalBookings: bookings.length,
            completed: bookings.filter(b => b.status === 'completed').length,
            revenue: bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.price || 0), 0),
            avgPrice: bookings.length ? (bookings.reduce((s, b) => s + (b.price || 0), 0) / bookings.length).toFixed(2) : 0,
            cancellations: bookings.filter(b => b.status === 'cancelled').length,
        };
        try {
            let full = '';
            await chatDeepSeek({
                messages: [{ role: 'user', content: type.prompt(data) }],
                systemPrompt: 'You are Simon, an elite AI business analyst for Truvornex service providers. Give precise, data-driven, actionable insights. Use markdown with headers and bullet points.',
                temperature: 0.65,
                maxTokens: 1000,
                onChunk: (delta, acc) => {
                    full = acc;
                    setStreaming(s => ({ ...s, [type.id]: acc }));
                },
            });
            setInsights(i => ({ ...i, [type.id]: full }));
        } catch (e) {
            setInsights(i => ({ ...i, [type.id]: `**Error:** ${e.message}` }));
        }
        setLoading(l => ({ ...l, [type.id]: false }));
        setStreaming(s => ({ ...s, [type.id]: '' }));
    };

    if (pageLoading) return (
        <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-wave h-24 rounded-2xl" />)}
        </div>
    );

    const totalRevenue = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.price || 0), 0);

    return (
        <div className="space-y-6 pb-24 md:pb-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(124,111,205,0.15)', border: '1px solid rgba(124,111,205,0.25)' }}>
                    <Cpu className="h-5 w-5" style={{ color: '#7c6fcd' }} />
                </div>
                <div>
                    <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--color-primary)' }}>
                        Simon Business Intelligence
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        AI-powered insights to grow your business · OpenRouter
                    </p>
                </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Total Bookings', value: bookings.length, color: '#7c6fcd' },
                    { label: 'Revenue', value: `$${totalRevenue.toFixed(0)}`, color: '#22c55e' },
                    { label: 'Avg Rating', value: provider?.rating?.toFixed(1) || '—', color: '#f59e0b' },
                ].map(s => (
                    <div key={s.label} className="card-premium p-4">
                        <div className="text-2xl font-black" style={{ color: 'var(--color-primary)' }}>{s.value}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Insight cards */}
            {INSIGHT_TYPES.map(type => {
                const display = loading[type.id] ? streaming[type.id] : insights[type.id];
                return (
                    <div key={type.id} className="card-premium p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                                    style={{ background: `${type.color}18` }}>
                                    <type.icon className="h-4 w-4" style={{ color: type.color }} />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>{type.label}</h2>
                                    <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>Simon AI · OpenRouter</p>
                                </div>
                            </div>
                            <button onClick={() => getInsight(type)} disabled={loading[type.id]}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                                style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                                {loading[type.id]
                                    ? <><Loader2 className="h-3 w-3 animate-spin" />Analyzing…</>
                                    : insights[type.id]
                                        ? <><RefreshCw className="h-3 w-3" />Refresh</>
                                        : <><Lightbulb className="h-3 w-3" />Get Insight</>}
                            </button>
                        </div>
                        {display ? (
                            <div className="rounded-xl p-4 prose prose-sm max-w-none text-sm leading-relaxed"
                                style={{ background: 'var(--color-surface-low)', color: 'var(--color-text)' }}>
                                <ReactMarkdown>{display}</ReactMarkdown>
                                {loading[type.id] && <span className="inline-block h-3 w-0.5 ml-0.5 bg-current animate-pulse" />}
                            </div>
                        ) : (
                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                Click to get Simon's AI analysis for {type.label.toLowerCase()}.
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
