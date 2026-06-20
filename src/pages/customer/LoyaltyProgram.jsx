import { useState, useEffect } from 'react';
import { Star, Zap, Crown, Award, TrendingUp, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const TIERS = [
    { name: 'New',      min: 0,    max: 499,      icon: Star,  perks: ['Access to all services', 'Basic support'] },
    { name: 'Regular',  min: 500,  max: 1999,     icon: Award, perks: ['5% discount on bookings', 'Priority booking slots', 'Early access to bundles'] },
    { name: 'VIP',      min: 2000, max: 4999,     icon: Zap,   perks: ['10% discount on all services', 'Dedicated support', 'Free cancellation', 'VIP provider matching'] },
    { name: 'Champion', min: 5000, max: Infinity, icon: Crown, perks: ['15% discount on all services', 'Personal concierge', 'First access to new features', 'Exclusive provider relationships', 'Monthly perks credits'] },
];

export default function LoyaltyProgram() {
    const [memory, setMemory] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setMemory({ lifetime_value: 0, loyalty_tier: 'new', booking_count: 0 });
        setLoading(false);
    }, []);

    const ltv = memory?.lifetime_value || 0;
    const tier = TIERS.find(t => ltv >= t.min && ltv <= t.max) || TIERS[0];
    const nextTier = TIERS[TIERS.indexOf(tier) + 1];
    const progress = nextTier ? ((ltv - tier.min) / (nextTier.min - tier.min)) * 100 : 100;

    if (loading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-wave h-24 rounded-xl" />)}</div>;

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="font-black text-2xl tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>Loyalty Program</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Earn rewards every time you book</p>
            </div>

            {/* Current tier card */}
            <div className="rounded-2xl p-6 shimmer" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-accent)', boxShadow: 'var(--shadow-card-hover)' }}>
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-subtle)' }}>Your Tier</p>
                        <div className="flex items-center gap-2.5">
                            <tier.icon className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
                            <h2 className="font-black text-3xl" style={{ color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>{tier.name}</h2>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Lifetime Value</p>
                        <p className="font-black text-2xl" style={{ color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>${ltv.toLocaleString()}</p>
                    </div>
                </div>
                {nextTier && (
                    <div>
                        <div className="flex justify-between text-[10px] mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                            <span>${ltv.toLocaleString()} spent</span>
                            <span>${nextTier.min.toLocaleString()} for {nextTier.name}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: 'var(--color-primary)' }} />
                        </div>
                        <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>${(nextTier.min - ltv).toLocaleString()} more to reach {nextTier.name}</p>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Total Bookings',  value: memory?.booking_count || 0 },
                    { label: 'Total Spent',      value: `$${ltv.toLocaleString()}` },
                    { label: 'Cancellations',    value: memory?.cancellation_count || 0 },
                ].map(s => (
                    <div key={s.label} className="rounded-xl p-4 text-center shimmer"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
                        <p className="font-black text-2xl" style={{ color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>{s.value}</p>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Tier benefits */}
            <div>
                <h2 className="font-bold text-sm mb-3 uppercase tracking-widest" style={{ color: 'var(--color-text-subtle)' }}>All Tiers</h2>
                <div className="space-y-2">
                    {TIERS.map((t) => {
                        const Icon = t.icon;
                        const isCurrentOrPast = ltv >= t.min;
                        const isCurrent = tier.name === t.name;
                        return (
                            <div key={t.name} className="rounded-xl p-4"
                                style={{
                                    backgroundColor: 'var(--color-surface)',
                                    border: `1px solid ${isCurrent ? 'var(--color-border-accent)' : 'var(--color-border)'}`,
                                    boxShadow: isCurrent ? 'var(--shadow-md)' : 'none',
                                }}>
                                <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-8 w-8 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: isCurrentOrPast ? 'var(--color-surface-high)' : 'var(--color-surface-low)', border: '1px solid var(--color-border)' }}>
                                            <Icon className="h-3.5 w-3.5" style={{ color: isCurrentOrPast ? 'var(--color-primary)' : 'var(--color-text-subtle)' }} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm" style={{ color: isCurrentOrPast ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{t.name}</p>
                                            <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                                                {t.max === Infinity ? `$${t.min.toLocaleString()}+` : `$${t.min.toLocaleString()} – $${t.max.toLocaleString()}`}
                                            </p>
                                        </div>
                                    </div>
                                    {isCurrent && (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>Current</span>
                                    )}
                                    {!isCurrentOrPast && <Lock className="h-3.5 w-3.5" style={{ color: 'var(--color-text-subtle)' }} />}
                                </div>
                                <ul className="space-y-1">
                                    {t.perks.map(p => (
                                        <li key={p} className="text-[11px] flex items-center gap-2"
                                            style={{ color: isCurrentOrPast ? 'var(--color-text-muted)' : 'var(--color-text-subtle)' }}>
                                            <span className="h-1.5 w-1.5 rounded-full shrink-0"
                                                style={{ backgroundColor: isCurrentOrPast ? 'var(--color-success)' : 'var(--color-text-subtle)' }} />
                                            {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Link to="/services" className="w-full flex items-center justify-center h-11 rounded-xl text-sm font-semibold transition-all"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                Book a Service &amp; Earn
            </Link>
        </div>
    );
}
