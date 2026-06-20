import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';

const CATS = ['cleaning','plumbing','hvac','moving','gardening','chef','handyman','fitness','tutoring','driving'];
const CAT_ICONS = {
    cleaning:'🧹', plumbing:'🔧', hvac:'❄️', moving:'📦',
    gardening:'🌿', chef:'👨‍🍳', handyman:'🔨', fitness:'💪', tutoring:'📚', driving:'🚗',
};
const DEMAND_COLOR = d => d >= 80 ? '#ef4444' : d >= 65 ? '#f59e0b' : d >= 45 ? '#3b82f6' : '#6b7280';

function DemandBar({ demand_index, category, price }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ width: 22, textAlign: 'center' }}>{CAT_ICONS[category] || '⚙️'}</span>
            <span style={{ width: 90, fontSize: 12, color: 'var(--color-text)', textTransform: 'capitalize', flexShrink: 0 }}>{category}</span>
            <div style={{ flex: 1, background: 'var(--color-border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{
                    width: `${demand_index}%`, height: '100%',
                    background: DEMAND_COLOR(demand_index),
                    borderRadius: 4, transition: 'width 0.8s ease',
                }} />
            </div>
            <span style={{ fontSize: 12, color: DEMAND_COLOR(demand_index), fontWeight: 600, width: 34, textAlign: 'right' }}>{demand_index}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', width: 80, textAlign: 'right' }}>₨{price?.toLocaleString()}</span>
        </div>
    );
}

function SectionHead({ title, sub }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{title}</h2>
            {sub && <p style={{ color: 'var(--color-text-subtle)', fontSize: 13, margin: '4px 0 0' }}>{sub}</p>}
        </div>
    );
}

function Card({ children, style = {} }) {
    return (
        <div style={{
            background: 'var(--color-card)', border: '1px solid var(--color-border)',
            borderRadius: 14, padding: 20, ...style,
        }}>{children}</div>
    );
}

export default function ZoneEconomy() {
    const { user } = useAuth();
    const [zoneId, setZoneId] = useState('hyderabad-main');
    const [area, setArea] = useState('Hyderabad');
    const [forecast, setForecast] = useState(null);
    const [forecastLoading, setForecastLoading] = useState(false);
    const [simonForecast, setSimonForecast] = useState(null);

    const [idleStart, setIdleStart] = useState('');
    const [idleEnd, setIdleEnd] = useState('');
    const [idleCats, setIdleCats] = useState([]);
    const [idleSlots, setIdleSlots] = useState([]);
    const [idleMsg, setIdleMsg] = useState('');
    const [idleLoading, setIdleLoading] = useState(false);

    const [zones, setZones] = useState([]);
    const [microJobs, setMicroJobs] = useState([]);

    const [matches, setMatches] = useState(null);
    const [matchLoading, setMatchLoading] = useState(false);

    const [goals, setGoals] = useState([]);
    const [goalTitle, setGoalTitle] = useState('');
    const [goalTarget, setGoalTarget] = useState('');
    const [goalDeadline, setGoalDeadline] = useState('');
    const [goalMsg, setGoalMsg] = useState('');

    const loadZones = useCallback(async () => {
        try {
            const r = await fetch('/api/zones');
            const d = await r.json();
            if (d.zones?.length > 0) {
                setZones(d.zones);
                if (!zoneId || zoneId === 'hyderabad-main') {
                    setZoneId(d.zones[0].id);
                    setArea(d.zones[0].area || d.zones[0].name);
                }
            }
        } catch { }
    }, []);

    const loadMicroJobs = useCallback(async () => {
        try {
            const r = await fetch(`/api/zones/${encodeURIComponent(zoneId)}/micro-jobs`);
            const d = await r.json();
            setMicroJobs(d.micro_jobs || []);
        } catch { }
    }, [zoneId]);

    const loadForecast = useCallback(async () => {
        setForecastLoading(true);
        try {
            const r = await fetch(`/api/zones/${encodeURIComponent(zoneId)}/forecast?area=${encodeURIComponent(area)}`);
            const d = await r.json();
            setForecast(d);
        } catch { } finally { setForecastLoading(false); }
    }, [zoneId, area]);

    const loadSimonForecast = useCallback(async () => {
        const r = await fetch('/api/simon/zone-forecast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zone_id: zoneId, area }),
        });
        const d = await r.json();
        setSimonForecast(d);
    }, [zoneId, area]);

    const loadIdleSlots = useCallback(async () => {
        if (!user) return;
        const r = await fetch('/api/zones/idle-slots');
        const d = await r.json();
        setIdleSlots(d.idle_slots || []);
    }, [user]);

    const loadGoals = useCallback(async () => {
        if (!user) return;
        const r = await fetch('/api/zones/savings-goals');
        const d = await r.json();
        setGoals(d.savings_goals || []);
    }, [user]);

    useEffect(() => { loadZones(); }, [loadZones]);
    useEffect(() => { loadForecast(); loadSimonForecast(); loadMicroJobs(); }, [loadForecast, loadSimonForecast, loadMicroJobs]);
    useEffect(() => { loadIdleSlots(); loadGoals(); }, [loadIdleSlots, loadGoals]);

    async function submitIdleSlot(e) {
        e.preventDefault();
        if (!idleStart || !idleEnd) return;
        setIdleLoading(true);
        try {
            const r = await fetch('/api/zones/idle-slots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ starts_at: idleStart, ends_at: idleEnd, categories: idleCats, zone_id: zoneId }),
            });
            const d = await r.json();
            setIdleMsg(d.message || 'Idle window registered.');
            setIdleStart(''); setIdleEnd(''); setIdleCats([]);
            loadIdleSlots();
        } catch { setIdleMsg('Failed to register slot.'); } finally { setIdleLoading(false); }
    }

    async function runIdleMatch() {
        setMatchLoading(true);
        try {
            const r = await fetch('/api/zones/micro-jobs/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            const d = await r.json();
            setMatches(d);
        } catch { } finally { setMatchLoading(false); }
    }

    async function acceptMicroJob(jobId) {
        await fetch(`/api/zones/micro-jobs/${jobId}/accept`, { method: 'PATCH' });
        setMatches(prev => prev ? { ...prev, matches: prev.matches.filter(j => j.id !== jobId) } : prev);
    }

    async function addGoal(e) {
        e.preventDefault();
        if (!goalTitle || !goalTarget) return;
        const r = await fetch('/api/zones/savings-goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: goalTitle, target_pkr: parseFloat(goalTarget), deadline: goalDeadline || undefined }),
        });
        const d = await r.json();
        setGoalMsg(d.message || 'Goal created.');
        setGoalTitle(''); setGoalTarget(''); setGoalDeadline('');
        loadGoals();
    }

    const topForecast = simonForecast?.forecast || [];
    const topOpp = simonForecast?.top_opportunity || forecast?.top_opportunity;

    return (
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 20px 80px' }}>
            <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                    Simon · Zone Economy · Layer 3
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Zone Economy Dashboard</h1>
                <p style={{ color: 'var(--color-text-subtle)', fontSize: 14, margin: '6px 0 16px' }}>
                    Autonomous demand forecasting, idle resource matching, and savings intelligence for your zone.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <input value={area} onChange={e => setArea(e.target.value)} placeholder="Area name"
                        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 14px', color: 'var(--color-text)', fontSize: 13, width: 180 }} />
                    <input value={zoneId} onChange={e => setZoneId(e.target.value)} placeholder="Zone ID"
                        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 14px', color: 'var(--color-text)', fontSize: 13, width: 180 }} />
                    <button onClick={() => { loadForecast(); loadSimonForecast(); }} style={{
                        background: 'var(--color-primary)', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>Refresh Forecast</button>
                </div>
            </div>

            {topOpp && (
                <div style={{
                    background: 'linear-gradient(135deg, #3b82f611, #8b5cf611)',
                    border: '1px solid #8b5cf640', borderRadius: 14, padding: '16px 20px', marginBottom: 20,
                    display: 'flex', alignItems: 'center', gap: 14,
                }}>
                    <div style={{ fontSize: 32 }}>⚡</div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>
                            Top Opportunity — {topOpp.category ? topOpp.category.charAt(0).toUpperCase() + topOpp.category.slice(1) : ''}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-subtle)' }}>{topOpp.reason}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 4 }}>Living wage floor: ₨800/hr guaranteed minimum</div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                <Card>
                    <SectionHead title="Simon Demand Intelligence" sub="Real-time category demand by area" />
                    {topForecast.length === 0 ? (
                        <p style={{ color: 'var(--color-text-subtle)', fontSize: 13 }}>Loading Simon forecast...</p>
                    ) : (
                        topForecast.map(f => (
                            <div key={f.category} style={{ marginBottom: 10 }}>
                                <DemandBar demand_index={f.demand_index} category={f.category} price={f.estimated_price_pkr} />
                                {f.supply_shortfall && (
                                    <div style={{ fontSize: 10, color: '#ef4444', marginLeft: 120, marginTop: -4, marginBottom: 4 }}>
                                        ⚠ Supply shortfall — providers urgently needed
                                    </div>
                                )}
                                {f.opportunity_note && (
                                    <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', marginLeft: 120, marginTop: -4, marginBottom: 4 }}>
                                        {f.opportunity_note}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </Card>

                <Card>
                    <SectionHead title="72h Zone Forecast" sub="Demand index by service category" />
                    {forecastLoading ? (
                        <p style={{ color: 'var(--color-text-subtle)', fontSize: 13 }}>Generating forecast...</p>
                    ) : forecast?.by_category ? (
                        forecast.by_category.slice(0, 8).map(({ category, slots }) => {
                            const avgDemand = slots?.length > 0
                                ? Math.round(slots.slice(0, 12).reduce((s, x) => s + (x.demand_index || 0), 0) / Math.min(slots.length, 12))
                                : 50;
                            const avgPrice = slots?.[0]?.estimated_price_pkr;
                            return <DemandBar key={category} demand_index={avgDemand} category={category} price={avgPrice} />;
                        })
                    ) : (
                        <p style={{ color: 'var(--color-text-subtle)', fontSize: 13 }}>No forecast data yet.</p>
                    )}
                    <p style={{ fontSize: 10, color: 'var(--color-text-subtle)', marginTop: 12 }}>
                        72h ahead · Bars show average demand · Red = surge · Floor: ₨800/hr
                    </p>
                </Card>
            </div>

            {microJobs.length > 0 && (
                <Card style={{ marginBottom: 24 }}>
                    <SectionHead title="Open Micro-Jobs in Zone" sub={`Live micro-jobs available in ${area}`} />
                    {microJobs.slice(0, 6).map(job => (
                        <div key={job.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 0', borderBottom: '1px solid var(--color-border)',
                            fontSize: 13, color: 'var(--color-text)', gap: 12,
                        }}>
                            <span style={{ fontWeight: 600 }}>{CAT_ICONS[job.category] || '⚙️'} {job.title}</span>
                            <span style={{ color: 'var(--color-text-subtle)', fontSize: 12 }}>{job.estimated_duration_hours}h</span>
                            <span style={{ fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0 }}>₨{Number(job.price_pkr).toLocaleString()}</span>
                        </div>
                    ))}
                </Card>
            )}

            {user?.role === 'provider' && (
                <>
                    <Card style={{ marginBottom: 20 }}>
                        <SectionHead title="Register Idle Window" sub="Tell Simon your available hours — it will match micro-jobs in your area" />
                        <form onSubmit={submitIdleSlot} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--color-text-subtle)', display: 'block', marginBottom: 4 }}>Window Start</label>
                                    <input type="datetime-local" value={idleStart} onChange={e => setIdleStart(e.target.value)} required
                                        style={{ width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '9px 12px', color: 'var(--color-text)', fontSize: 13 }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--color-text-subtle)', display: 'block', marginBottom: 4 }}>Window End</label>
                                    <input type="datetime-local" value={idleEnd} onChange={e => setIdleEnd(e.target.value)} required
                                        style={{ width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '9px 12px', color: 'var(--color-text)', fontSize: 13 }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--color-text-subtle)', display: 'block', marginBottom: 6 }}>Your Skills (optional — leave blank for all)</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {CATS.map(c => (
                                        <button key={c} type="button"
                                            onClick={() => setIdleCats(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])}
                                            style={{
                                                background: idleCats.includes(c) ? 'var(--color-primary)' : 'var(--color-bg)',
                                                color: idleCats.includes(c) ? '#fff' : 'var(--color-text)',
                                                border: '1px solid var(--color-border)', borderRadius: 6,
                                                padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                                            }}>{CAT_ICONS[c]} {c}</button>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" disabled={idleLoading} style={{
                                background: 'var(--color-primary)', color: '#fff', border: 'none',
                                borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start',
                            }}>
                                {idleLoading ? 'Registering...' : 'Register Window'}
                            </button>
                            {idleMsg && <p style={{ fontSize: 13, color: 'var(--color-primary)', margin: 0 }}>{idleMsg}</p>}
                        </form>

                        {idleSlots.length > 0 && (
                            <div style={{ marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                                <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginBottom: 8 }}>Your Idle Windows</div>
                                {idleSlots.map(s => (
                                    <div key={s.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '8px 0', borderBottom: '1px solid var(--color-border)',
                                        fontSize: 12, color: 'var(--color-text)',
                                    }}>
                                        <span>{new Date(s.starts_at).toLocaleDateString()} {new Date(s.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(s.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span style={{
                                            background: s.status === 'matched' ? '#10b98120' : 'var(--color-bg)',
                                            color: s.status === 'matched' ? '#10b981' : 'var(--color-text-subtle)',
                                            border: '1px solid var(--color-border)', borderRadius: 5,
                                            padding: '2px 8px', fontSize: 11,
                                        }}>{s.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card style={{ marginBottom: 20 }}>
                        <SectionHead title="Simon Idle Matching" sub="Let Simon find micro-jobs that fit your open windows" />
                        <button onClick={runIdleMatch} disabled={matchLoading} style={{
                            background: 'var(--color-primary)', color: '#fff', border: 'none',
                            borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 16,
                        }}>
                            {matchLoading ? 'Simon is matching…' : '⚡ Find Micro-Jobs for My Windows'}
                        </button>
                        {matches && (
                            <div>
                                <p style={{ fontSize: 13, color: 'var(--color-text-subtle)', marginBottom: 12 }}>{matches.message}</p>
                                {matches.matches?.map(job => (
                                    <div key={job.id} style={{
                                        background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                                        borderRadius: 10, padding: '14px', marginBottom: 10,
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3 }}>
                                                {CAT_ICONS[job.category] || '⚙️'} {job.title}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginBottom: 4 }}>{job.description}</div>
                                            <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>
                                                {job.estimated_duration_hours}h · {job.area}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>₨{Number(job.price_pkr).toLocaleString()}</div>
                                            <button onClick={() => acceptMicroJob(job.id)} style={{
                                                background: '#10b981', color: '#fff', border: 'none',
                                                borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 6,
                                            }}>Accept</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card>
                        <SectionHead title="Savings Goals" sub="Simon routes idle-time micro-jobs toward your financial targets" />
                        <form onSubmit={addGoal} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                            <input value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="Goal (e.g. Buy a generator)" required
                                style={{ flex: 1, minWidth: 160, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '9px 12px', color: 'var(--color-text)', fontSize: 13 }} />
                            <input type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="Target ₨" required
                                style={{ width: 120, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '9px 12px', color: 'var(--color-text)', fontSize: 13 }} />
                            <input type="date" value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)}
                                style={{ width: 140, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '9px 12px', color: 'var(--color-text)', fontSize: 13 }} />
                            <button type="submit" style={{
                                background: 'var(--color-primary)', color: '#fff', border: 'none',
                                borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            }}>Add Goal</button>
                        </form>
                        {goalMsg && <p style={{ fontSize: 13, color: 'var(--color-primary)', marginBottom: 12 }}>{goalMsg}</p>}
                        {goals.map(g => {
                            const pct = Math.min(100, Math.round((parseFloat(g.saved_pkr) / parseFloat(g.target_pkr)) * 100));
                            return (
                                <div key={g.id} style={{ marginBottom: 14, background: 'var(--color-bg)', borderRadius: 10, padding: 14, border: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{g.title}</span>
                                        <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>₨{Number(g.saved_pkr).toLocaleString()} / ₨{Number(g.target_pkr).toLocaleString()}</span>
                                    </div>
                                    <div style={{ background: 'var(--color-border)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-primary)', borderRadius: 4, transition: 'width 0.8s' }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                        <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{pct}% saved{g.simon_routing_active ? ' · Simon routing active' : ''}</span>
                                        {g.deadline && <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>By {g.deadline}</span>}
                                    </div>
                                </div>
                            );
                        })}
                        {goals.length === 0 && <p style={{ color: 'var(--color-text-subtle)', fontSize: 13 }}>No savings goals yet. Simon will route matching micro-jobs toward your target automatically.</p>}
                    </Card>
                </>
            )}

            {!user && (
                <Card>
                    <p style={{ color: 'var(--color-text-subtle)', fontSize: 14 }}>Sign in as a provider to register idle windows, receive micro-job matches, and set savings goals.</p>
                </Card>
            )}
        </div>
    );
}
