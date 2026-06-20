import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { rankProviders, predictDemand, predictRepeatBookings, findBundleOpportunities, TRUST_TIER_STYLE } from '@/lib/ai/engine';
import useGeolocation from '@/hooks/useGeolocation';
import {
    Sparkles, TrendingUp, TrendingDown, ArrowRight, Star, CheckCircle, Zap, RefreshCw, Layers, RotateCcw, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const DEMAND_STYLES = {
    high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', icon: TrendingUp, label: 'High Demand' },
    rising: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: TrendingUp, label: 'Rising' },
    normal: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: ArrowRight, label: 'Normal' },
    low: { bg: 'bg-zinc-50', text: 'text-zinc-500', border: 'border-zinc-100', icon: TrendingDown, label: 'Low Season' },
};

const CONFIDENCE_STYLE = {
    high: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-zinc-100 text-zinc-500',
};

function ProviderAICard({ provider, rank }) {
    const ts = TRUST_TIER_STYLE[provider.trustTier] || TRUST_TIER_STYLE.new;
    return (
        <Link to={`/providers/${provider.id}`} className="card-premium p-4 block group hover:-translate-y-0.5 transition-all">
            <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                    {provider.logo_url ? (
                        <img src={provider.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center font-black text-xl"
                            style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-subtle)' }}>
                            {provider.business_name?.[0]}
                        </div>
                    )}
                    <span className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full text-[10px] font-black flex items-center justify-center"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                        {rank}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm truncate transition-colors" style={{ color: 'var(--color-primary)' }}>{provider.business_name}</h3>
                        {provider.verified && <CheckCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ts.bg} ${ts.text} ${ts.border}`}>
                            {provider.trustLabel}
                        </span>
                        {provider.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-zinc-500">
                                <Star className="h-3 w-3 fill-zinc-400 text-zinc-400" />
                                {provider.rating?.toFixed(1)}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />{provider.completionRate || 0}% completion</span>
                        <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{provider.completedJobs || 0} jobs</span>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <div className="text-lg font-black" style={{ color: 'var(--color-primary)' }}>{provider.aiScore}</div>
                    <div className="text-[10px] font-medium" style={{ color: 'var(--color-text-subtle)' }}>AI Score</div>
                    <div className="h-1.5 w-12 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: `${provider.aiScore}%` }} />
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default function SmartRecommendations() {
    const [providers, setProviders] = useState([]);
    const [categories, setCategories] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [userEmail, setUserEmail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [catFilter, setCatFilter] = useState('all');
    const { location: userLoc } = useGeolocation();

    useEffect(() => {
        setUserEmail(null);
        setProviders([]);
        setCategories([]);
        setBookings([]);
        setLoading(false);
    }, []);

    const rankedProviders = useMemo(() =>
        rankProviders(providers, bookings, userLoc?.[0], userLoc?.[1], catFilter === 'all' ? null : catFilter),
        [providers, bookings, userLoc, catFilter]
    );

    const demandForecast = useMemo(() =>
        predictDemand(categories, bookings).slice(0, 8),
        [categories, bookings]
    );

    const repeatPredictions = useMemo(() => {
        if (!userEmail) return [];
        return predictRepeatBookings(bookings.filter(b => b.status === 'completed' && b.customer_email === userEmail));
    }, [bookings, userEmail]);

    const bundleOpportunities = useMemo(() => findBundleOpportunities(bookings).slice(0, 3), [bookings]);

    if (loading) return (
        <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-wave h-20 rounded-2xl" />)}
        </div>
    );

    return (
        <div className="space-y-10 pb-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-float">
                    <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="font-inter font-black text-2xl tracking-tight">Smart Recommendations</h1>
                    <p className="text-zinc-400 text-sm">AI-ranked providers · demand forecast · repeat predictions</p>
                </div>
            </div>

            {/* Repeat booking predictions */}
            {repeatPredictions.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <RotateCcw className="h-4.5 w-4.5 text-indigo-500" />
                        <h2 className="font-inter font-bold text-lg">Predicted for You</h2>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">AI Prediction</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {repeatPredictions.slice(0, 3).map((p, i) => (
                            <div key={i} className="card-premium p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                        <RefreshCw className="h-4 w-4 text-indigo-500" />
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{
                                            backgroundColor: p.confidence === 'high' ? 'rgba(16,185,129,0.12)' : p.confidence === 'medium' ? 'rgba(245,158,11,0.12)' : 'var(--color-surface-high)',
                                            color: p.confidence === 'high' ? '#10b981' : p.confidence === 'medium' ? '#f59e0b' : 'var(--color-text-muted)',
                                        }}>
                                        {p.confidence} confidence
                                    </span>
                                </div>
                                <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--color-primary)' }}>{p.service}</p>
                                <p className="text-xs mb-3" style={{ color: 'var(--color-text-subtle)' }}>
                                    Every ~{p.avgIntervalDays} days · booked {p.bookingCount}×
                                </p>
                                <div className="text-sm font-bold" style={{ color: p.daysUntil <= 3 ? '#ef4444' : p.daysUntil <= 7 ? '#f59e0b' : 'var(--color-primary)' }}>
                                    {p.daysUntil <= 0 ? 'Due now' : p.daysUntil === 1 ? 'Due tomorrow' : `Due in ${p.daysUntil} days`}
                                </div>
                                <div className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>{format(new Date(p.nextDate + 'T12:00:00'), 'MMM d, yyyy')}</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Demand forecast */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4.5 w-4.5 text-amber-500" />
                    <h2 className="font-inter font-bold text-lg">Seasonal Demand Forecast</h2>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold capitalize">
                        {new Date().toLocaleString('default', { month: 'long' })}
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {demandForecast.map(cat => {
                        const ds = DEMAND_STYLES[cat.demandLevel] || DEMAND_STYLES.normal;
                        const Icon = ds.icon;
                        return (
                            <Link key={cat.id} to={`/category/${cat.slug}`} className={`rounded-2xl border p-4 ${ds.bg} ${ds.border} hover:shadow-premium transition-all`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${ds.text}`}>{ds.label}</span>
                                    <Icon className={`h-3.5 w-3.5 ${ds.text}`} />
                                </div>
                                <p className={`font-bold text-sm ${ds.text}`}>{cat.name}</p>
                                <div className="mt-2">
                                    <div className="h-1 bg-white/50 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${cat.demandLevel === 'high' ? 'bg-red-500' : cat.demandLevel === 'rising' ? 'bg-amber-500' : 'bg-blue-400'}`}
                                            style={{ width: `${Math.min(cat.multiplier, 200) / 2}%` }} />
                                    </div>
                                </div>
                                <p className={`text-xs mt-1 opacity-70 font-medium ${ds.text}`}>{cat.multiplier}% of avg</p>
                            </Link>
                        );
                    })}
                </div>
            </section>

            {/* AI-ranked providers */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Zap className="h-4.5 w-4.5 text-violet-500" />
                        <h2 className="font-inter font-bold text-lg">AI-Ranked Providers</h2>
                        <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">Trust × Distance × Availability</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                        {[['all', 'All'], ...categories.slice(0, 4).map(c => [c.slug, c.name.split(' ')[0]])].map(([v, l]) => (
                            <button key={v} onClick={() => setCatFilter(v)}
                                className="h-7 px-3 rounded-xl text-xs font-semibold transition-all"
                                style={{
                                    backgroundColor: catFilter === v ? 'var(--color-primary)' : 'var(--color-surface-high)',
                                    color: catFilter === v ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                                    border: 'none', fontFamily: 'inherit', cursor: 'pointer',
                                }}>
                                {l}
                            </button>
                        ))}
                    </div>
                </div>

                {rankedProviders.length === 0 ? (
                    <div className="card-premium p-10 text-center">
                        <p className="text-sm" style={{ color: 'var(--color-text-subtle)' }}>No providers found for this category.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rankedProviders.slice(0, 8).map((p, i) => <ProviderAICard key={p.id} provider={p} rank={i + 1} />)}
                    </div>
                )}

                {rankedProviders.length > 8 && (
                    <Button asChild variant="outline" className="w-full mt-3 rounded-xl">
                        <Link to="/nearby">View all {rankedProviders.length} providers on map</Link>
                    </Button>
                )}
            </section>

            {/* Bundle opportunities */}
            {bundleOpportunities.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Layers className="h-4.5 w-4.5 text-blue-500" />
                        <h2 className="font-inter font-bold text-lg">Bundle Opportunities</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {bundleOpportunities.map((b, i) => (
                            <Link key={i} to="/bundles" className="bg-blue-50 border border-blue-100 rounded-2xl p-4 hover:shadow-premium transition-all">
                                <p className="font-bold text-sm text-blue-800 mb-1">{b.service}</p>
                                <p className="text-xs text-blue-600">{b.count} similar requests in your area</p>
                                <p className="text-xs font-black text-blue-700 mt-2">Save up to {b.estimatedSaving}</p>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}