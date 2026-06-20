import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { detectAnomalies, findBundleOpportunities, predictDemand, rankProviders } from '@/lib/ai/engine';
import { simonAnalyzePlatform, simonExplainAnomaly, simonStatus } from '@/lib/ai/simon';
import {
    AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { ShieldCheck, CalendarDays, AlertTriangle, TrendingUp,
    Zap, CheckCircle, Layers, ArrowRight, Sparkles, Brain, RefreshCw, Wifi, WifiOff
} from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';
import ReactMarkdown from 'react-markdown';

const useThemeColors = () => {
    const get = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    return {
        accent: get('--color-accent') || '#7c6fcd',
        success: get('--color-success') || '#22c55e',
        warning: get('--color-warning') || '#f59e0b',
        error: get('--color-error') || '#ef4444',
        grid: get('--chart-grid') || 'rgba(128,128,128,0.1)',
        text: get('--color-text-subtle') || '#6b6f82',
    };
};

const KPI = ({ label, value, sub, icon: Icon, accent, delta }) => (
    <div style={{
        backgroundColor: accent ? 'var(--color-primary)' : 'var(--color-surface)',
        color: accent ? 'var(--color-on-primary)' : 'var(--color-text)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        padding: 20,
        boxShadow: 'var(--shadow-sm)',
    }}>
        <div className="flex items-center justify-between mb-3">
            <span style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: accent ? 'rgba(255,255,255,0.55)' : 'var(--color-text-subtle)',
            }}>{label}</span>
            <div style={{
                height: 32, width: 32, borderRadius: 10,
                backgroundColor: accent ? 'rgba(255,255,255,0.12)' : 'var(--color-surface-high)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon style={{ width: 15, height: 15, color: accent ? 'rgba(255,255,255,0.7)' : 'var(--color-text-subtle)' }} />
            </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em' }}>{value}</div>
        {sub && <div style={{ fontSize: 11, marginTop: 4, color: accent ? 'rgba(255,255,255,0.5)' : 'var(--color-text-subtle)' }}>{sub}</div>}
    </div>
);

const SEVERITY_CONFIG = {
    high:   { bg: 'var(--color-error-bg)',   border: 'rgba(239,68,68,0.3)',   text: 'var(--color-error)',   label: 'High' },
    medium: { bg: 'var(--color-warning-bg)', border: 'rgba(245,158,11,0.3)', text: 'var(--color-warning)', label: 'Medium' },
    low:    { bg: 'var(--color-surface-high)', border: 'var(--color-border)',  text: 'var(--color-text-muted)', label: 'Low' },
};

export default function Dashboard() {
    const [providers, setProviders] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [simonReport, setSimonReport] = useState('');
    const [simonLoading, setSimonLoading] = useState(false);
    const [explainedAnomaly, setExplainedAnomaly] = useState(null);
    const [anomalyExplanation, setAnomalyExplanation] = useState('');
    const colors = useThemeColors();

    const metrics = useMemo(() => {
        const completed = bookings.filter(b => b.status === 'completed');
        const pending   = bookings.filter(b => b.status === 'pending');
        const cancelled = bookings.filter(b => b.status === 'cancelled');
        const approved  = providers.filter(p => p.status === 'approved');
        const pendingProvs = providers.filter(p => p.status === 'pending');

        const totalRevenue  = completed.reduce((s, b) => s + (b.price || 0), 0);
        const monthStart    = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const monthRevenue  = completed.filter(b => b.date >= monthStart).reduce((s, b) => s + (b.price || 0), 0);

        const daily = {};
        for (let i = 13; i >= 0; i--) {
            const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
            daily[d] = { date: format(subDays(new Date(), i), 'MMM d'), bookings: 0, revenue: 0 };
        }
        bookings.forEach(b => {
            if (daily[b.date]) {
                daily[b.date].bookings++;
                if (b.status === 'completed') daily[b.date].revenue += (b.price || 0);
            }
        });

        const demand    = predictDemand(categories, bookings).slice(0, 6);
        const anomalies = detectAnomalies(bookings, approved);
        const topProviders = rankProviders(approved, bookings, null, null, null).slice(0, 5);
        const bundles   = findBundleOpportunities(bookings);
        const total     = bookings.length;
        const completionRate   = total > 0 ? Math.round(completed.length / total * 100) : 0;
        const cancellationRate = total > 0 ? Math.round(cancelled.length / total * 100) : 0;

        return {
            totalBookings: bookings.length, completedCount: completed.length,
            pendingCount: pending.length, approvedProviders: approved.length,
            pendingProviders: pendingProvs.length, totalRevenue, monthRevenue,
            completionRate, cancellationRate,
            dailyData: Object.values(daily), demand, anomalies, topProviders, bundles,
        };
    }, [providers, bookings, categories]);

    const runSimonReport = async () => {
        if (!simonStatus().configured) {
            setSimonReport('**Simon AI is not configured.** Add `OPENROUTER_API_KEY` to your environment variables to activate hyper-intelligent platform analysis.');
            return;
        }
        setSimonLoading(true);
        setSimonReport('');
        try {
            await simonAnalyzePlatform({
                providers: providers.length,
                approvedProviders: metrics.approvedProviders,
                pendingProviders: metrics.pendingProviders,
                bookings: bookings.length,
                completedBookings: metrics.completedCount,
                pendingBookings: metrics.pendingCount,
                revenue: metrics.totalRevenue,
                completionRate: metrics.completionRate,
                avgRating: providers.reduce((s, p) => s + (p.rating || 0), 0) / Math.max(providers.length, 1),
            }, (delta) => setSimonReport(prev => prev + delta));
        } catch (e) {
            setSimonReport('Simon encountered an error. Check your API key configuration.');
        }
        setSimonLoading(false);
    };

    const explainAnomaly = async (anomaly) => {
        if (!simonStatus().configured) return;
        setExplainedAnomaly(anomaly);
        setAnomalyExplanation('');
        try {
            await simonExplainAnomaly(anomaly, {}, (delta) => setAnomalyExplanation(prev => prev + delta));
        } catch (e) {
            setAnomalyExplanation('Unable to analyze anomaly.');
        }
    };

    if (loading) return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-wave h-28 rounded-2xl" />)}
            </div>
            <div className="skeleton-wave h-64 rounded-2xl" />
        </div>
    );

    return (
        <div className="space-y-7 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, var(--color-accent), #5b4fc4)' }}>
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-black text-2xl tracking-tight" style={{ color: 'var(--color-text)' }}>Admin Intelligence</h1>
                        <p className="text-sm" style={{ color: 'var(--color-text-subtle)' }}>Simon AI-powered platform overview</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {metrics.anomalies.length > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                            style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.3)' }}>
                            <AlertTriangle className="h-4 w-4" style={{ color: 'var(--color-error)' }} />
                            <span className="text-sm font-semibold" style={{ color: 'var(--color-error)' }}>{metrics.anomalies.length} anomalies</span>
                        </div>
                    )}
                    <button
                        onClick={runSimonReport}
                        disabled={simonLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={{ backgroundColor: 'var(--color-accent)', color: '#fff', opacity: simonLoading ? 0.7 : 1 }}>
                        <Brain className="h-4 w-4" />
                        {simonLoading ? 'Simon analyzing…' : 'Simon Analysis'}
                    </button>
                </div>
            </div>

            {/* Simon Report */}
            {simonReport && (
                <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                        <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>Simon's Platform Intelligence Report</span>
                    </div>
                    <div className="prose prose-sm max-w-none" style={{ color: 'var(--color-text)' }}>
                        <ReactMarkdown>{simonReport}</ReactMarkdown>
                    </div>
                </div>
            )}

            {/* KPI grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPI accent label="Total Revenue" value={`$${metrics.totalRevenue.toFixed(0)}`} sub={`$${metrics.monthRevenue.toFixed(0)} this month`} icon={TrendingUp} />
                <KPI label="Total Bookings" value={metrics.totalBookings} sub={`${metrics.completedCount} completed`} icon={CalendarDays} />
                <KPI label="Providers" value={metrics.approvedProviders} sub={`${metrics.pendingProviders} pending review`} icon={ShieldCheck} />
                <KPI label="Completion Rate" value={`${metrics.completionRate}%`} sub={`${metrics.cancellationRate}% cancelled`} icon={CheckCircle} />
            </div>

            {/* Activity chart */}
            <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Platform Activity — Last 14 Days</h2>
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={metrics.dailyData} margin={{ left: -10 }}>
                        <defs>
                            <linearGradient id="bkGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors.accent} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={colors.accent} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: colors.text }} interval={3} />
                        <YAxis tick={{ fontSize: 10, fill: colors.text }} allowDecimals={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)' }}
                            formatter={(v) => [v, 'Bookings']} />
                        <Area type="monotone" dataKey="bookings" stroke={colors.accent} strokeWidth={2} fill="url(#bkGrad)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Anomaly alerts */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4" style={{ color: 'var(--color-warning)' }} />
                        <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Anomaly Alerts</h2>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>{metrics.anomalies.length}</span>
                    </div>
                    {metrics.anomalies.length === 0 ? (
                        <div className="rounded-2xl p-4 flex items-center gap-3"
                            style={{ backgroundColor: 'var(--color-success-bg)', border: '1px solid rgba(34,197,94,0.25)' }}>
                            <CheckCircle className="h-5 w-5 shrink-0" style={{ color: 'var(--color-success)' }} />
                            <p className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>No anomalies detected. Platform is healthy.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {metrics.anomalies.slice(0, 5).map((a, i) => {
                                const s = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.medium;
                                return (
                                    <div key={i} className="rounded-2xl p-4 cursor-pointer transition-all"
                                        style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}
                                        onClick={() => explainAnomaly(a)}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold" style={{ color: s.text }}>{a.title}</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}>{s.label}</span>
                                        </div>
                                        <p className="text-xs opacity-80" style={{ color: s.text }}>{a.detail}</p>
                                        {simonStatus().configured && (
                                            <p className="text-[10px] mt-1.5 opacity-60" style={{ color: s.text }}>Click for Simon's analysis →</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Anomaly explanation panel */}
                    {explainedAnomaly && (
                        <div className="mt-3 rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)' }}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                    <Brain className="h-3.5 w-3.5" style={{ color: 'var(--color-accent)' }} />
                                    <span className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>Simon's Analysis</span>
                                </div>
                                <button onClick={() => { setExplainedAnomaly(null); setAnomalyExplanation(''); }}
                                    className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>✕ Close</button>
                            </div>
                            <div className="prose prose-xs max-w-none text-xs leading-relaxed">
                                <ReactMarkdown>{anomalyExplanation || '⏳ Simon is analyzing…'}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>

                {/* Demand forecast */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                        <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Demand Forecast</h2>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize"
                            style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                            {new Date().toLocaleString('default', { month: 'long' })}
                        </span>
                    </div>
                    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={metrics.demand} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 10, fill: colors.text }} allowDecimals={false} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: colors.text }} width={80} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)' }}
                                    formatter={(v) => [v, 'Forecast']} />
                                <Bar dataKey="demandForecast" radius={[0, 4, 4, 0]}>
                                    {metrics.demand.map((d, i) => (
                                        <Cell key={i} fill={
                                            d.demandLevel === 'high' ? colors.error :
                                            d.demandLevel === 'rising' ? colors.warning : colors.accent
                                        } />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Providers by AI score */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                        <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Top AI-Ranked Providers</h2>
                    </div>
                    <Link to="/x7k9m2q4p8w1n5v3r6t0y/admin/providers"
                        className="flex items-center gap-1 text-sm transition-colors"
                        style={{ color: 'var(--color-text-subtle)' }}>
                        Manage all <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    {metrics.topProviders.length === 0 ? (
                        <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-subtle)' }}>No approved providers yet.</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead style={{ backgroundColor: 'var(--color-surface-low)' }}>
                                <tr>
                                    {['Provider', 'AI Score', 'Trust', 'Completion'].map(h => (
                                        <th key={h} className={`px-5 py-3 text-[11px] font-bold uppercase tracking-wider ${h === 'Provider' ? 'text-left' : 'text-right'}`}
                                            style={{ color: 'var(--color-text-subtle)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.topProviders.map((p, i) => (
                                    <tr key={p.id} className="transition-colors"
                                        style={{ borderTop: '1px solid var(--color-border)' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-low)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <td className="px-5 py-3 flex items-center gap-2">
                                            <span className="text-xs font-bold w-4" style={{ color: 'var(--color-text-subtle)' }}>{i + 1}</span>
                                            <span className="font-medium" style={{ color: 'var(--color-text)' }}>{p.business_name}</span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                                                    <div className="h-full rounded-full" style={{
                                                        width: `${p.aiScore}%`,
                                                        background: 'linear-gradient(90deg, var(--color-accent), #5b4fc4)',
                                                    }} />
                                                </div>
                                                <span className="font-bold" style={{ color: 'var(--color-text)' }}>{p.aiScore}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>{p.trustScore}/100</span>
                                        </td>
                                        <td className="px-5 py-3 text-right" style={{ color: 'var(--color-text-subtle)' }}>{p.completionRate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Bundle opportunities */}
            {metrics.bundles.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Layers className="h-4 w-4" style={{ color: 'var(--color-info)' }} />
                        <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Bundle Opportunities</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {metrics.bundles.slice(0, 3).map((b, i) => (
                            <div key={i} className="rounded-2xl p-4"
                                style={{ backgroundColor: 'var(--color-info-bg)', border: '1px solid rgba(59,130,246,0.25)' }}>
                                <p className="font-bold text-sm" style={{ color: 'var(--color-info)' }}>{b.service}</p>
                                <p className="text-xs mt-0.5 opacity-80" style={{ color: 'var(--color-info)' }}>{b.count} matching requests</p>
                                <p className="text-xs font-black mt-2" style={{ color: 'var(--color-info)' }}>Potential saving: {b.estimatedSaving}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
