import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, AlertTriangle, Activity } from 'lucide-react';

function heatColor(demand, supply) {
    if (demand > 70 && supply < 3) return { bg: 'rgba(239,68,68,0.10)', bar: '#ef4444', label: 'Surge', text: '#ef4444' };
    if (demand > 50)               return { bg: 'rgba(245,158,11,0.10)', bar: '#f59e0b', label: 'High',  text: '#f59e0b' };
    if (supply > 5)                return { bg: 'rgba(34,197,94,0.10)',  bar: '#22c55e', label: 'Active', text: '#22c55e' };
    return                               { bg: 'rgba(99,102,241,0.08)', bar: '#818cf8', label: 'Calm',   text: '#818cf8' };
}

export default function ZoneHeatmap() {
    const navigate = useNavigate();
    const [zones, setZones]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [connected, setConnected] = useState(false);
    const esRef = useRef(null);

    useEffect(() => {
        let reconnectTimer = null;

        function connect() {
            if (esRef.current) {
                esRef.current.close();
            }

            const es = new EventSource('/api/realtime/zone-heatmap');
            esRef.current = es;

            es.addEventListener('zone_heatmap', (e) => {
                try {
                    const d = JSON.parse(e.data);
                    if (d.zones) {
                        setZones(d.zones);
                        setUpdatedAt(d.updated_at);
                        setLoading(false);
                        setConnected(true);
                    }
                } catch (_) {}
            });

            es.onerror = () => {
                setConnected(false);
                es.close();
                // Auto-reconnect after 5s
                reconnectTimer = setTimeout(connect, 5000);
            };
        }

        connect();

        return () => {
            clearTimeout(reconnectTimer);
            esRef.current?.close();
        };
    }, []);

    if (loading) return (
        <section style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-high)' }}>
                <div className="skeleton-wave h-3 w-32 rounded" />
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3].map(i => <div key={i} className="skeleton-wave h-12 rounded-lg" />)}
            </div>
        </section>
    );

    if (!zones.length) return null;

    return (
        <section style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-high)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.18)' }}>
                        <Activity style={{ width: 9, height: 9, color: '#818cf8' }} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>Zone Availability Heatmap</span>
                    <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        backgroundColor: connected ? '#22c55e' : '#f59e0b',
                        animation: connected ? 'pulse 2s infinite' : 'none',
                        flexShrink: 0,
                    }} title={connected ? 'Live — server push' : 'Reconnecting…'} />
                </div>
                {updatedAt && (
                    <span style={{ fontSize: 9, color: 'var(--color-text-subtle)' }}>
                        {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>

            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {zones.map((zone) => {
                    const heat = heatColor(zone.demand_index, zone.online_providers);
                    const demandPct = Math.min(100, zone.demand_index || 0);
                    const supplyPct = Math.min(100, (zone.online_providers || 0) * 10);

                    return (
                        <div key={zone.id}
                            onClick={() => navigate('/neighborhood')}
                            style={{
                                borderRadius: 10, padding: '8px 10px', cursor: 'pointer',
                                backgroundColor: heat.bg,
                                border: `1px solid ${heat.bar}22`,
                                transition: 'all 0.18s cubic-bezier(0.25,1,0.5,1)',
                                display: 'flex', alignItems: 'center', gap: 10,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = 'none'; }}>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                                        <MapPin style={{ width: 9, height: 9, color: heat.text, flexShrink: 0 }} />
                                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {zone.name}
                                        </span>
                                        {zone.open_emergencies > 0 && (
                                            <span style={{ fontSize: 8, fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <AlertTriangle style={{ width: 8, height: 8 }} />{zone.open_emergencies}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: 9, fontWeight: 700, color: heat.text, backgroundColor: `${heat.bar}22`, padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>
                                        {heat.label}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 8, color: 'var(--color-text-subtle)', width: 40, flexShrink: 0 }}>Demand</span>
                                        <div style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'var(--color-surface-high)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${demandPct}%`, backgroundColor: heat.bar, borderRadius: 2, transition: 'width 0.6s cubic-bezier(0.19,1,0.22,1)' }} />
                                        </div>
                                        <span style={{ fontSize: 8, color: heat.text, fontWeight: 700, width: 20, textAlign: 'right', flexShrink: 0 }}>{demandPct}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 8, color: 'var(--color-text-subtle)', width: 40, flexShrink: 0 }}>Supply</span>
                                        <div style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'var(--color-surface-high)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${supplyPct}%`, backgroundColor: '#22c55e', borderRadius: 2, transition: 'width 0.6s cubic-bezier(0.19,1,0.22,1)' }} />
                                        </div>
                                        <span style={{ fontSize: 8, color: '#22c55e', fontWeight: 700, width: 20, textAlign: 'right', flexShrink: 0 }}>{zone.online_providers}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <Users style={{ width: 8, height: 8, color: 'var(--color-text-subtle)' }} />
                                    <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 600 }}>{zone.online_providers}</span>
                                </div>
                                <div style={{ fontSize: 8, color: 'var(--color-text-subtle)' }}>
                                    {zone.bookings_24h > 0 ? `${zone.bookings_24h} jobs` : 'no jobs'}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', gap: 10 }}>
                    {[
                        { color: '#22c55e', label: 'Active' },
                        { color: '#f59e0b', label: 'High demand' },
                        { color: '#ef4444', label: 'Surge' },
                        { color: '#818cf8', label: 'Calm' },
                    ].map(l => (
                        <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: l.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 8, color: 'var(--color-text-subtle)' }}>{l.label}</span>
                        </span>
                    ))}
                </div>
                <button onClick={() => navigate('/neighborhood')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: 'var(--color-text-subtle)', fontWeight: 600, padding: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-subtle)'}>
                    Full neighborhood view →
                </button>
            </div>
        </section>
    );
}
