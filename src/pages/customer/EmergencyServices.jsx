import { useState, useEffect } from 'react';
import { Zap, AlertTriangle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const URGENCY_LEVELS = [
    { label: 'Right Now',      sub: 'Within 1 hour',  activeColor: 'rgba(252,165,165,0.15)', activeBorder: 'var(--color-error)' },
    { label: 'Within 4 Hours', sub: 'Same day',        activeColor: 'rgba(252,211,77,0.12)',  activeBorder: 'var(--color-warning)' },
    { label: 'Today',          sub: 'Within 8 hours',  activeColor: 'var(--color-surface-high)', activeBorder: 'var(--color-border-accent)' },
];

export default function EmergencyServices() {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUrgency, setSelectedUrgency] = useState(0);
    const [requesting, setRequesting] = useState(false);

    useEffect(() => { setProviders([]); setLoading(false); }, []);

    const requestEmergency = async () => {
        setRequesting(true);
        await new Promise(r => setTimeout(r, 1200));
        setRequesting(false);
        toast.success('Emergency request sent! Providers will respond shortly.');
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid rgba(252,165,165,0.2)' }}>
                    <Zap className="h-4 w-4" style={{ color: 'var(--color-error)' }} />
                </div>
                <div>
                    <h1 className="font-black text-xl tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>Emergency Services</h1>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>On-demand urgent service dispatch</p>
                </div>
            </div>

            {/* Warning banner */}
            <div className="rounded-xl p-3.5 flex items-start gap-2.5"
                style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid rgba(252,165,165,0.2)' }}>
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-error)' }} />
                <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-error)' }}>For life-threatening emergencies, call 911</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>This service is for home emergencies like burst pipes, power outages, and lockouts.</p>
                </div>
            </div>

            {/* Urgency selector */}
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-subtle)' }}>How urgent is it?</p>
                <div className="grid grid-cols-3 gap-2">
                    {URGENCY_LEVELS.map((u, i) => {
                        const active = selectedUrgency === i;
                        return (
                            <button key={i} onClick={() => setSelectedUrgency(i)}
                                className="rounded-xl p-3 text-center transition-all"
                                style={{
                                    backgroundColor: active ? u.activeColor : 'var(--color-surface)',
                                    border: `1px solid ${active ? u.activeBorder : 'var(--color-border)'}`,
                                    cursor: 'pointer',
                                }}>
                                <p className="font-bold text-xs" style={{ color: 'var(--color-primary)' }}>{u.label}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{u.sub}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* CTA */}
            <button className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={{ backgroundColor: 'var(--color-error)', color: '#ffffff', border: 'none', cursor: 'pointer', opacity: requesting ? 0.7 : 1 }}
                onClick={requestEmergency} disabled={requesting}
                onMouseEnter={e => !requesting && (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = requesting ? '0.7' : '1')}>
                <Zap className="h-4 w-4" />
                {requesting ? 'Dispatching…' : 'Request Emergency Service'}
            </button>

            {/* Provider list */}
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--color-text-subtle)' }}>
                    Available Emergency Providers ({providers.length})
                </p>
                {loading ? (
                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-wave h-14 rounded-xl" />)}</div>
                ) : providers.length === 0 ? (
                    <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <Users className="h-7 w-7 mx-auto mb-2" style={{ color: 'var(--color-text-subtle)' }} />
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No emergency providers available in your area right now</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {providers.map(p => (
                            <Link key={p.id} to={`/providers/${p.id}`}
                                className="rounded-xl p-3.5 flex items-center gap-3 transition-all"
                                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', textDecoration: 'none' }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-accent)')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
                                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: 'var(--color-surface-high)' }}>
                                    {p.logo_url
                                        ? <img src={p.logo_url} alt="" className="h-full w-full object-cover rounded-xl" />
                                        : <span className="font-bold text-sm" style={{ color: 'var(--color-text-muted)' }}>{p.business_name?.[0]}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>{p.business_name}</p>
                                    <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{p.city} · ⭐ {p.rating?.toFixed(1) || 'New'}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-success)' }} />
                                    <span className="text-xs font-semibold" style={{ color: 'var(--color-success)' }}>Available</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
