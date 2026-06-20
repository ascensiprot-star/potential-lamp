import { useState, useEffect } from 'react';
import { Activity, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DEMAND_META = {
    low:      { label: 'Low demand',  color: 'var(--color-text-subtle)', bg: 'var(--color-surface-high)' },
    moderate: { label: 'Moderate',    color: '#f59e0b',                  bg: 'rgba(245,158,11,0.08)'     },
    high:     { label: 'High demand', color: '#f97316',                  bg: 'rgba(249,115,22,0.08)'     },
    surge:    { label: 'Surge',       color: '#ef4444',                  bg: 'rgba(239,68,68,0.08)'      },
};

export default function SimonBookingHint({ serviceType, date, timeSlot, price }) {
    const [hint, setHint] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!date || !timeSlot) return;
        let cancelled = false;
        setLoading(true);
        setHint(null);
        fetch('/api/simon/booking-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceType, date, timeSlot, price }),
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (!cancelled) { setHint(data); setLoading(false); } })
            .catch(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [date, timeSlot]);

    if (loading) return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            borderRadius: 10, padding: '9px 12px', marginTop: 12,
            backgroundColor: 'var(--color-surface-high)',
            border: '1px solid var(--color-border)',
            animation: 'fadeIn 0.2s ease',
        }}>
            <span style={{ position: 'relative', width: 6, height: 6, flexShrink: 0, display: 'inline-block' }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: '#7c6fcd', opacity: 0.35, animation: 'pingRing 1.4s ease-out infinite' }} />
                <span style={{ position: 'absolute', inset: '1px', borderRadius: '50%', backgroundColor: '#7c6fcd' }} />
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', letterSpacing: '-0.01em' }}>
                Simon is analysing your booking…
            </span>
        </div>
    );

    if (!hint) return null;

    const demand = DEMAND_META[hint.demandLevel] || DEMAND_META.moderate;

    return (
        <div style={{
            borderRadius: 12, marginTop: 12, overflow: 'hidden',
            border: '1px solid var(--color-border-strong)',
            backgroundColor: 'var(--color-surface)',
            animation: 'fadeInUp 0.32s cubic-bezier(0.19,1,0.22,1) both',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-high)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ position: 'relative', width: 6, height: 6, flexShrink: 0, display: 'inline-block' }}>
                        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: '#7c6fcd', opacity: 0.3, animation: 'pingRing 1.8s ease-out infinite' }} />
                        <span style={{ position: 'absolute', inset: '1px', borderRadius: '50%', backgroundColor: '#7c6fcd' }} />
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
                        Simon · Booking Intelligence
                    </span>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, backgroundColor: demand.bg, color: demand.color, border: `1px solid ${demand.color}44` }}>
                    {demand.label}
                </span>
            </div>

            {/* Body */}
            <div style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124,111,205,0.12)', border: '1px solid rgba(124,111,205,0.22)' }}>
                        <Activity style={{ width: 12, height: 12, color: '#7c6fcd' }} />
                    </div>
                    <p style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--color-text-muted)', margin: 0 }}>
                        {hint.timingSuggestion}
                    </p>
                </div>

                {hint.savingsTip && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                        <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.22)' }}>
                            <TrendingUp style={{ width: 12, height: 12, color: '#06b6d4' }} />
                        </div>
                        <p style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--color-text-muted)', margin: 0 }}>
                            {hint.savingsTip}
                        </p>
                    </div>
                )}

                <button
                    onClick={() => navigate('/ai')}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 10, fontWeight: 600, color: '#7c6fcd', background: 'none', border: 'none', cursor: 'pointer', padding: 0, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                    Ask Simon more about this booking <ArrowRight style={{ width: 9, height: 9 }} />
                </button>
            </div>
        </div>
    );
}
