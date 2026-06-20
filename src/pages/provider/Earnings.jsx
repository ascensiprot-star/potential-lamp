import { useState, useEffect, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
    DollarSign, TrendingUp, TrendingDown, CalendarDays, CheckCircle,
    XCircle, AlertTriangle, ArrowUpRight, Download, Clock, Sparkles, Loader2
} from 'lucide-react';
import { format, startOfWeek, startOfMonth, subDays, subMonths } from 'date-fns';
import { chatOpenRouter as chatDeepSeek, isConfigured } from '@/lib/openrouter';
import ReactMarkdown from 'react-markdown';

const TABS = ['Overview', 'By Service', 'Loss Tracker', 'Trends'];
const PIE_COLORS = ['#7c6fcd', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];

function fmt(n) { return `$${(n || 0).toFixed(0)}`; }

function KPICard({ label, value, sub, icon: Icon, accent, trend }) {
    return (
        <div className="rounded-2xl p-5 transition-all"
            style={accent
                ? { background: 'var(--color-primary)', border: '1px solid var(--color-border)' }
                : { background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: accent ? 'var(--color-on-primary)' : 'var(--color-text-subtle)', opacity: accent ? 0.6 : 1 }}>
                    {label}
                </span>
                <div className="h-8 w-8 rounded-xl flex items-center justify-center"
                    style={{ background: accent ? 'rgba(255,255,255,0.1)' : 'var(--color-surface-high)' }}>
                    <Icon className="h-4 w-4" style={{ color: accent ? 'var(--color-on-primary)' : 'var(--color-text-subtle)', opacity: accent ? 0.7 : 1 }} />
                </div>
            </div>
            <div className="text-3xl font-black tracking-tight"
                style={{ color: accent ? 'var(--color-on-primary)' : 'var(--color-primary)' }}>
                {value}
            </div>
            {sub && <div className="text-xs mt-1.5" style={{ color: accent ? 'var(--color-on-primary)' : 'var(--color-text-muted)', opacity: accent ? 0.6 : 1 }}>{sub}</div>}
            {trend != null && (
                <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    <ArrowUpRight className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
                    {Math.abs(trend).toFixed(1)}% vs last month
                </div>
            )}
        </div>
    );
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="px-3 py-2 rounded-xl text-xs font-semibold shadow-lg"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', color: 'var(--color-primary)' }}>
            <div style={{ color: 'var(--color-text-muted)' }}>{label}</div>
            <div>{fmt(payload[0].value)}</div>
        </div>
    );
}

export default function Earnings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('Overview');
    const [aiInsight, setAiInsight] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiStream, setAiStream] = useState('');

    useEffect(() => { setBookings([]); setLoading(false); }, []);

    const metrics = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const lastMonthStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
        const lastMonthEnd = format(subDays(startOfMonth(new Date()), 1), 'yyyy-MM-dd');

        const completed = bookings.filter(b => b.status === 'completed');
        const cancelled = bookings.filter(b => b.status === 'cancelled');
        const noShow = bookings.filter(b => b.status === 'no_show');
        const pending = bookings.filter(b => b.status === 'pending');

        const totalRevenue = completed.reduce((s, b) => s + (b.price || 0), 0);
        const todayRevenue = completed.filter(b => b.date === today).reduce((s, b) => s + (b.price || 0), 0);
        const weekRevenue = completed.filter(b => b.date >= weekStart).reduce((s, b) => s + (b.price || 0), 0);
        const monthRevenue = completed.filter(b => b.date >= monthStart).reduce((s, b) => s + (b.price || 0), 0);
        const lastMonthRevenue = completed.filter(b => b.date >= lastMonthStart && b.date <= lastMonthEnd).reduce((s, b) => s + (b.price || 0), 0);
        const trend = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : null;

        const cancelledLoss = cancelled.reduce((s, b) => s + (b.price || 0), 0);
        const noShowLoss = noShow.reduce((s, b) => s + (b.price || 0), 0);

        const byService = {};
        completed.forEach(b => {
            const s = b.service_name || 'Other';
            if (!byService[s]) byService[s] = { name: s, revenue: 0, count: 0 };
            byService[s].revenue += (b.price || 0);
            byService[s].count++;
        });

        const last6 = [];
        for (let i = 5; i >= 0; i--) {
            const d = subMonths(new Date(), i);
            const start = format(startOfMonth(d), 'yyyy-MM-dd');
            const end = format(startOfMonth(subMonths(d, -1)), 'yyyy-MM-dd');
            const rev = completed.filter(b => b.date >= start && b.date < end).reduce((s, b) => s + (b.price || 0), 0);
            last6.push({ name: format(d, 'MMM'), value: rev });
        }

        return {
            totalRevenue, todayRevenue, weekRevenue, monthRevenue, lastMonthRevenue, trend,
            cancelledLoss, noShowLoss, pending: pending.length,
            completionRate: bookings.length ? Math.round((completed.length / bookings.length) * 100) : 0,
            byService: Object.values(byService).sort((a, b) => b.revenue - a.revenue).slice(0, 6),
            lostRevenue: [...cancelled, ...noShow],
            trendData: last6,
        };
    }, [bookings]);

    const getAiInsight = async () => {
        if (!isConfigured()) {
            setAiInsight('**OpenRouter not configured** — Add `OPENROUTER_API_KEY` to unlock AI earning insights.');
            return;
        }
        setAiLoading(true);
        setAiInsight('');
        setAiStream('');
        try {
            let full = '';
            await chatDeepSeek({
                messages: [{
                    role: 'user',
                    content: `Analyze my provider earnings and give a business performance report:
- Total revenue: ${fmt(metrics.totalRevenue)}
- This month: ${fmt(metrics.monthRevenue)} (${metrics.trend != null ? `${metrics.trend >= 0 ? '+' : ''}${metrics.trend?.toFixed(1)}% vs last month` : 'first month'})
- Completion rate: ${metrics.completionRate}%
- Revenue lost to cancellations: ${fmt(metrics.cancelledLoss)}
- Revenue lost to no-shows: ${fmt(metrics.noShowLoss)}
- Top services: ${metrics.byService.slice(0, 3).map(s => `${s.name} ($${s.revenue})`).join(', ') || 'none yet'}

Give:
1. **Performance score** (A-F) with explanation
2. **Top 3 revenue growth opportunities**
3. **How to reduce the $${fmt(metrics.cancelledLoss + metrics.noShowLoss)} revenue loss**
4. **Pricing recommendations** based on performance
5. **30-day revenue target** with action plan`
                }],
                systemPrompt: 'You are Simon, an elite AI revenue analyst for Truvornex service providers. Give precise, actionable insights with specific dollar amounts and percentages.',
                temperature: 0.65,
                maxTokens: 1000,
                onChunk: (delta, acc) => { full = acc; setAiStream(acc); },
            });
            setAiInsight(full);
        } catch (e) {
            setAiInsight(`**Error:** ${e.message}`);
        }
        setAiLoading(false);
        setAiStream('');
    };

    if (loading) return (
        <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="skeleton-wave h-28 rounded-2xl" />)}
        </div>
    );

    const displayInsight = aiLoading ? aiStream : aiInsight;

    return (
        <div className="pb-24 md:pb-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--color-primary)' }}>Earnings</h1>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Revenue tracker & AI performance insights</p>
                </div>
                <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-surface)' }}>
                    <Download className="h-3.5 w-3.5" /> Export
                </button>
            </div>

            {/* Tab selector */}
            <div className="flex gap-1 overflow-x-auto pb-0.5">
                {TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                        style={tab === t
                            ? { background: 'var(--color-primary)', color: 'var(--color-on-primary)' }
                            : { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                        {t}
                    </button>
                ))}
            </div>

            {tab === 'Overview' && (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <KPICard label="Total Revenue" value={fmt(metrics.totalRevenue)} sub={`${metrics.completionRate}% completion`} icon={DollarSign} accent />
                        <KPICard label="This Month" value={fmt(metrics.monthRevenue)} sub="calendar month" icon={CalendarDays} trend={metrics.trend} />
                        <KPICard label="This Week" value={fmt(metrics.weekRevenue)} sub="Mon–Sun" icon={TrendingUp} />
                        <KPICard label="Today" value={fmt(metrics.todayRevenue)} sub={`${metrics.pending} pending`} icon={Clock} />
                    </div>
                    <div className="card-premium p-5">
                        <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--color-primary)' }}>Revenue Trend (6 months)</h2>
                        <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={metrics.trendData}>
                                <defs>
                                    <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-subtle)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-subtle)' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} fill="url(#earnGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}

            {tab === 'By Service' && (
                <div className="space-y-3">
                    {metrics.byService.length > 0 ? metrics.byService.map((s, i) => (
                        <div key={s.name} className="card-premium p-4 flex items-center gap-4">
                            <div className="h-3 w-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-primary)' }}>{s.name}</div>
                                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.count} bookings</div>
                            </div>
                            <div className="font-black text-lg" style={{ color: 'var(--color-primary)' }}>{fmt(s.revenue)}</div>
                        </div>
                    )) : (
                        <div className="card-premium p-8 text-center">
                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No completed bookings yet</p>
                        </div>
                    )}
                </div>
            )}

            {tab === 'Loss Tracker' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="card-premium p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <XCircle className="h-4 w-4 text-red-400" />
                                <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Cancellations</span>
                            </div>
                            <div className="text-2xl font-black text-red-400">{fmt(metrics.cancelledLoss)}</div>
                            <div className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>lost revenue</div>
                        </div>
                        <div className="card-premium p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-orange-400" />
                                <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>No-Shows</span>
                            </div>
                            <div className="text-2xl font-black text-orange-400">{fmt(metrics.noShowLoss)}</div>
                            <div className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>lost revenue</div>
                        </div>
                    </div>
                    {metrics.lostRevenue.length > 0 ? (
                        <div className="space-y-2">
                            {metrics.lostRevenue.slice(0, 10).map((b, i) => (
                                <div key={i} className="card-premium p-3 flex items-center gap-3">
                                    <div className={`h-2 w-2 rounded-full shrink-0 ${b.status === 'cancelled' ? 'bg-red-400' : 'bg-orange-400'}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate" style={{ color: 'var(--color-primary)' }}>
                                            {b.service_name || 'Service'} · {b.date}
                                        </div>
                                        <div className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>{b.status?.replace('_', ' ')}</div>
                                    </div>
                                    <div className="font-semibold text-sm text-red-400">{fmt(b.price)}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="card-premium p-8 text-center">
                            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                            <p className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>No losses yet!</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>All bookings completed successfully</p>
                        </div>
                    )}
                </div>
            )}

            {tab === 'Trends' && (
                <div className="card-premium p-5">
                    <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--color-primary)' }}>Monthly Revenue</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={metrics.trendData}>
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-subtle)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-subtle)' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" fill="#7c6fcd" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Simon AI Earnings Insight */}
            <div className="card-premium p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(34,197,94,0.12)' }}>
                            <Sparkles className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>Simon's Earnings Analysis</h2>
                            <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>Powered by OpenRouter AI</p>
                        </div>
                    </div>
                    <button onClick={getAiInsight} disabled={aiLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                        style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                        {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {aiLoading ? 'Analyzing...' : aiInsight ? 'Refresh' : 'Analyze'}
                    </button>
                </div>
                {displayInsight ? (
                    <div className="rounded-xl p-4 prose prose-sm max-w-none text-sm leading-relaxed"
                        style={{ background: 'var(--color-surface-low)', color: 'var(--color-text)' }}>
                        <ReactMarkdown>{displayInsight}</ReactMarkdown>
                        {aiLoading && <span className="inline-block h-3 w-0.5 ml-0.5 bg-current animate-pulse" />}
                    </div>
                ) : (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        Click "Analyze" for Simon's AI-powered earnings analysis and growth recommendations.
                    </p>
                )}
            </div>
        </div>
    );
}
