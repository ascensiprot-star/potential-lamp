import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { DollarSign, TrendingUp, Package, Cpu, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { chatOpenRouter as chatDeepSeek, isConfigured } from '@/lib/openrouter';
import ReactMarkdown from 'react-markdown';

const CHART_COLORS = ['#7c6fcd', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4'];

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="px-3 py-2 rounded-xl text-xs font-semibold shadow-lg"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', color: 'var(--color-primary)' }}>
            <div style={{ color: 'var(--color-text-muted)' }}>{label}</div>
            <div>${payload[0].value.toFixed(0)}</div>
        </div>
    );
}

export default function SpendingAnalytics() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [aiInsight, setAiInsight] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiStreaming, setAiStreaming] = useState('');

    useEffect(() => {
        setBookings([]);
        setLoading(false);
    }, []);

    const stats = useMemo(() => {
        const total = bookings.reduce((s, b) => s + (b.price || 0), 0);
        const byCategory = {};
        bookings.forEach(b => {
            const cat = b.service_name?.split(' ')[0] || 'Other';
            byCategory[cat] = (byCategory[cat] || 0) + (b.price || 0);
        });
        const byMonth = {};
        bookings.forEach(b => {
            if (b.date) {
                const m = b.date.slice(0, 7);
                byMonth[m] = (byMonth[m] || 0) + (b.price || 0);
            }
        });
        return {
            total,
            avg: bookings.length ? (total / bookings.length).toFixed(2) : 0,
            count: bookings.length,
            byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
            byMonth: Object.entries(byMonth).map(([name, value]) => ({ name: name.slice(5), value })).slice(-6),
        };
    }, [bookings]);

    const getAiInsight = async () => {
        if (!isConfigured()) {
            setAiInsight('**OpenRouter not configured** — Add `OPENROUTER_API_KEY` to your environment variables to unlock Simon AI spending insights.');
            return;
        }
        setAiLoading(true);
        setAiInsight('');
        setAiStreaming('');
        try {
            const prompt = `Analyze my service spending data and give personalized savings advice:
- Total spent: $${stats.total.toFixed(2)}
- Number of bookings: ${stats.count}
- Average per booking: $${stats.avg}
- Top categories: ${stats.byCategory.map(c => `${c.name} ($${c.value})`).join(', ') || 'none yet'}
- Monthly trend: ${stats.byMonth.map(m => `${m.name}: $${m.value}`).join(', ') || 'no data yet'}

Provide:
1. **Spending health score** (0-100) with explanation
2. **Top 3 savings opportunities** with specific dollar amounts
3. **Optimal booking timing** based on seasonal patterns
4. **Bundle recommendation** if applicable
5. **Next month forecast** with suggested budget

Be specific, data-driven, and actionable. Use markdown formatting.`;

            await chatDeepSeek({
                messages: [{ role: 'user', content: prompt }],
                systemPrompt: 'You are Simon, Truvornex\'s AI financial advisor for home services. Analyze spending patterns and give hyper-personalized, actionable savings advice. Be specific with numbers.',
                temperature: 0.65,
                maxTokens: 1200,
                onChunk: (delta, full) => setAiStreaming(full),
            });
            setAiInsight(aiStreaming || '');
        } catch (e) {
            setAiInsight(`**Error:** ${e.message}`);
        }
        setAiLoading(false);
        setAiStreaming('');
    };

    const displayInsight = aiLoading ? aiStreaming : aiInsight;

    const kpis = [
        { label: 'Total Spent', value: `$${stats.total.toFixed(0)}`, icon: DollarSign, color: '#7c6fcd' },
        { label: 'Avg per Booking', value: `$${stats.avg}`, icon: TrendingUp, color: '#f59e0b' },
        { label: 'Completed', value: stats.count, icon: Package, color: '#22c55e' },
    ];

    if (loading) return (
        <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="skeleton-wave h-32 rounded-2xl" />)}
        </div>
    );

    return (
        <div className="pb-24 md:pb-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(124,111,205,0.15)', border: '1px solid rgba(124,111,205,0.25)' }}>
                    <DollarSign className="h-5 w-5" style={{ color: '#7c6fcd' }} />
                </div>
                <div>
                    <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--color-primary)' }}>
                        Spending Analytics
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        AI-powered insights into your service spending
                    </p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
                {kpis.map(k => (
                    <div key={k.label} className="card-premium p-4">
                        <div className="h-8 w-8 rounded-xl flex items-center justify-center mb-2"
                            style={{ background: `${k.color}20` }}>
                            <k.icon className="h-4 w-4" style={{ color: k.color }} />
                        </div>
                        <div className="text-2xl font-black" style={{ color: 'var(--color-primary)' }}>{k.value}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            {/* Monthly chart */}
            {stats.byMonth.length > 0 ? (
                <div className="card-premium p-5">
                    <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--color-primary)' }}>Monthly Spending</h2>
                    <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={stats.byMonth}>
                            <defs>
                                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7c6fcd" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#7c6fcd" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-subtle)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-subtle)' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="value" stroke="#7c6fcd" strokeWidth={2} fill="url(#spendGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="card-premium p-8 text-center">
                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                        style={{ background: 'var(--color-surface-high)' }}>
                        <TrendingUp className="h-6 w-6" style={{ color: 'var(--color-text-subtle)' }} />
                    </div>
                    <p className="font-semibold text-sm mb-1" style={{ color: 'var(--color-primary)' }}>No spending data yet</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Connect Supabase to track your booking history and unlock AI spending insights.
                    </p>
                </div>
            )}

            {/* Category breakdown */}
            {stats.byCategory.length > 0 && (
                <div className="card-premium p-5">
                    <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--color-primary)' }}>Spending by Category</h2>
                    <div className="flex items-center gap-6">
                        <PieChart width={120} height={120}>
                            <Pie data={stats.byCategory} cx={55} cy={55} innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={2}>
                                {stats.byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </Pie>
                        </PieChart>
                        <div className="flex-1 space-y-2">
                            {stats.byCategory.map((c, i) => (
                                <div key={c.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                        <span className="text-sm" style={{ color: 'var(--color-text)' }}>{c.name}</span>
                                    </div>
                                    <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>${c.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Simon AI Insight */}
            <div className="card-premium p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(124,111,205,0.15)' }}>
                            <Sparkles className="h-4 w-4" style={{ color: '#7c6fcd' }} />
                        </div>
                        <div>
                            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>Simon's Savings Advice</h2>
                            <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>Powered by OpenRouter AI</p>
                        </div>
                    </div>
                    <button onClick={getAiInsight} disabled={aiLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                        style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                        {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        {aiLoading ? 'Analyzing...' : aiInsight ? 'Refresh' : 'Get AI Advice'}
                    </button>
                </div>
                {displayInsight ? (
                    <div className="prose prose-sm max-w-none rounded-xl p-4 text-sm leading-relaxed"
                        style={{ background: 'var(--color-surface-low)', color: 'var(--color-text)' }}>
                        <ReactMarkdown>{displayInsight}</ReactMarkdown>
                        {aiLoading && <span className="inline-block h-3 w-0.5 ml-0.5 bg-current animate-pulse" />}
                    </div>
                ) : (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        Click "Get AI Advice" for personalized savings recommendations from Simon — powered by OpenRouter AI.
                    </p>
                )}
            </div>
        </div>
    );
}
