import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'AED', 'CAD', 'AUD'];
const SERVICE_CATS = [
    { key: 'cleaning',  icon: '🧹', label: 'Home Cleaning' },
    { key: 'grocery',   icon: '🛒', label: 'Grocery Delivery' },
    { key: 'medical',   icon: '🏥', label: 'Medical Transport' },
    { key: 'cooking',   icon: '👨‍🍳', label: 'Meal Preparation' },
    { key: 'handyman',  icon: '🔨', label: 'Handyman Repairs' },
    { key: 'gardening', icon: '🌿', label: 'Gardening' },
    { key: 'tutoring',  icon: '📚', label: 'Tutoring (kids)' },
    { key: 'driving',   icon: '🚗', label: 'Transport / Errands' },
];

const STATUS_META = {
    pending:      { color: '#6b7280', bg: '#6b728018', label: 'Pending'      },
    scheduled:    { color: '#3b82f6', bg: '#3b82f618', label: 'Scheduled'    },
    in_progress:  { color: '#f59e0b', bg: '#f59e0b18', label: 'In Progress'  },
    completed:    { color: '#10b981', bg: '#10b98118', label: 'Completed'    },
    proof_sent:   { color: '#8b5cf6', bg: '#8b5cf618', label: 'Proof Sent'  },
    cancelled:    { color: '#ef4444', bg: '#ef444418', label: 'Cancelled'    },
};

const CITY_OPTIONS = ['Hyderabad', 'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Multan', 'Faisalabad', 'Peshawar'];

function Card({ children, style = {} }) {
    return (
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 20, ...style }}>
            {children}
        </div>
    );
}

export default function CareBridge() {
    const { user } = useAuth();
    const [tab, setTab] = useState('orders');
    const [orders, setOrders] = useState([]);
    const [rates, setRates] = useState({ EUR: 310, USD: 278, GBP: 355, AED: 75, CAD: 205, AUD: 182 });
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    const [form, setForm] = useState({
        recipient_name: '', recipient_phone: '', recipient_city: 'Hyderabad', recipient_country: 'PK',
        currency_sent: 'EUR', amount_sent: '', notes: '',
        services: [],
    });

    const [proof, setProof] = useState({ url: '', notes: '', orderId: null });
    const [proofMsg, setProofMsg] = useState('');

    const loadOrders = useCallback(async () => {
        if (!user) return;
        const r = await fetch('/api/care-bridge');
        const d = await r.json();
        setOrders(d.orders || []);
    }, [user]);

    useEffect(() => {
        fetch('/api/care-bridge/meta/rates').then(r => r.json()).then(d => setRates(d.rates || rates)).catch(() => {});
        loadOrders();
    }, [loadOrders]);

    const pkrEquiv = form.amount_sent ? Math.round(parseFloat(form.amount_sent) * (rates[form.currency_sent] || 310)) : 0;

    function toggleService(key) {
        setForm(prev => ({
            ...prev,
            services: prev.services.some(s => s.category === key)
                ? prev.services.filter(s => s.category !== key)
                : [...prev.services, { category: key, notes: '' }],
        }));
    }

    async function submitOrder(e) {
        e.preventDefault();
        if (!form.recipient_name || !form.recipient_phone || !form.amount_sent || form.services.length === 0) {
            setMsg('Fill all required fields and select at least one service.'); return;
        }
        setLoading(true); setMsg('');
        try {
            const r = await fetch('/api/care-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    amount_sent: parseFloat(form.amount_sent),
                    exchange_rate: rates[form.currency_sent],
                }),
            });
            const d = await r.json();
            if (d.error) { setMsg(d.error); return; }
            setMsg(`✓ Order placed! ${form.recipient_name} in ${form.recipient_city} will receive ₨${pkrEquiv.toLocaleString()} worth of services.`);
            setForm({ recipient_name: '', recipient_phone: '', recipient_city: 'Hyderabad', recipient_country: 'PK', currency_sent: 'EUR', amount_sent: '', notes: '', services: [] });
            loadOrders(); setTab('orders');
        } catch { setMsg('Failed to place order.'); } finally { setLoading(false); }
    }

    async function submitProof(orderId) {
        if (!proof.url) { setProofMsg('Photo URL required.'); return; }
        const r = await fetch(`/api/care-bridge/${orderId}/proof`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proof_photo_url: proof.url, proof_notes: proof.notes }),
        });
        const d = await r.json();
        setProofMsg(d.message || 'Proof submitted.');
        setProof({ url: '', notes: '', orderId: null });
        loadOrders();
    }

    async function updateStatus(orderId, status) {
        await fetch(`/api/care-bridge/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        loadOrders();
    }

    const inputStyle = {
        width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
        borderRadius: 8, padding: '10px 12px', color: 'var(--color-text)', fontSize: 13,
    };
    const labelStyle = { fontSize: 12, color: 'var(--color-text-subtle)', display: 'block', marginBottom: 4 };

    return (
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px 80px' }}>
            <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                    Layer 4 · Financial Rail
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Family Care Bridge</h1>
                <p style={{ color: 'var(--color-text-subtle)', fontSize: 14, margin: '6px 0 0' }}>
                    Book verified local services for family back home. They receive services — not cash. You get photo proof.
                </p>
            </div>

            <div style={{ display: 'flex', gap: 4, background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
                {[['new-order', 'Send Care'], ['orders', 'My Orders']].map(([k, l]) => (
                    <button key={k} onClick={() => setTab(k)} style={{
                        background: tab === k ? 'var(--color-primary)' : 'transparent',
                        color: tab === k ? '#fff' : 'var(--color-text-subtle)',
                        border: 'none', borderRadius: 7, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>{l}</button>
                ))}
            </div>

            {tab === 'new-order' && (
                <Card>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 20px' }}>New Care Bridge Order</h2>
                    <form onSubmit={submitOrder} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={labelStyle}>Recipient Name *</label>
                                <input value={form.recipient_name} onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))}
                                    placeholder="e.g. Ammi, Abu, Dada..." required style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Recipient Phone *</label>
                                <input value={form.recipient_phone} onChange={e => setForm(p => ({ ...p, recipient_phone: e.target.value }))}
                                    placeholder="+92 300 0000000" required style={inputStyle} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={labelStyle}>City</label>
                                <select value={form.recipient_city} onChange={e => setForm(p => ({ ...p, recipient_city: e.target.value }))} style={inputStyle}>
                                    {CITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Country</label>
                                <select value={form.recipient_country} onChange={e => setForm(p => ({ ...p, recipient_country: e.target.value }))} style={inputStyle}>
                                    <option value="PK">Pakistan</option>
                                    <option value="IN">India</option>
                                    <option value="BD">Bangladesh</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Amount to Send</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 10, marginBottom: 10 }}>
                                <select value={form.currency_sent} onChange={e => setForm(p => ({ ...p, currency_sent: e.target.value }))} style={inputStyle}>
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input type="number" step="0.01" min="1" value={form.amount_sent}
                                    onChange={e => setForm(p => ({ ...p, amount_sent: e.target.value }))}
                                    placeholder="Amount" required style={inputStyle} />
                            </div>
                            {pkrEquiv > 0 && (
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: '#10b98112', border: '1px solid #10b98130', borderRadius: 8, padding: '10px 14px',
                                }}>
                                    <span style={{ fontSize: 13, color: 'var(--color-text-subtle)' }}>
                                        1 {form.currency_sent} = {rates[form.currency_sent]} PKR
                                    </span>
                                    <span style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>
                                        ₨{pkrEquiv.toLocaleString()} in services
                                    </span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ ...labelStyle, marginBottom: 10 }}>Services to Book * (select all that apply)</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                                {SERVICE_CATS.map(({ key, icon, label }) => {
                                    const selected = form.services.some(s => s.category === key);
                                    return (
                                        <button key={key} type="button" onClick={() => toggleService(key)} style={{
                                            background: selected ? 'var(--color-primary)' : 'var(--color-bg)',
                                            color: selected ? '#fff' : 'var(--color-text)',
                                            border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                            borderRadius: 8, padding: '10px', fontSize: 13, cursor: 'pointer', textAlign: 'left',
                                        }}>
                                            <span style={{ fontSize: 16, display: 'block', marginBottom: 3 }}>{icon}</span>
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Special Notes</label>
                            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                placeholder="Any specific instructions for the service provider..."
                                rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                        </div>

                        {msg && (
                            <div style={{
                                background: msg.startsWith('✓') ? '#10b98114' : '#ef444414',
                                border: `1px solid ${msg.startsWith('✓') ? '#10b98140' : '#ef444440'}`,
                                borderRadius: 8, padding: '10px 14px', fontSize: 13,
                                color: msg.startsWith('✓') ? '#059669' : '#dc2626',
                            }}>{msg}</div>
                        )}

                        <button type="submit" disabled={loading} style={{
                            background: 'var(--color-primary)', color: '#fff', border: 'none',
                            borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                        }}>
                            {loading ? 'Placing Order…' : `Send Care Package${pkrEquiv > 0 ? ` — ₨${pkrEquiv.toLocaleString()}` : ''}`}
                        </button>
                    </form>
                </Card>
            )}

            {tab === 'orders' && (
                <div>
                    {orders.length === 0 ? (
                        <Card>
                            <div style={{ textAlign: 'center', padding: '30px 0' }}>
                                <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
                                <p style={{ color: 'var(--color-text-subtle)', fontSize: 14 }}>
                                    No orders yet. Send your first Care Bridge to family back home.
                                </p>
                                <button onClick={() => setTab('new-order')} style={{
                                    background: 'var(--color-primary)', color: '#fff', border: 'none',
                                    borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 12,
                                }}>Send Care Now</button>
                            </div>
                        </Card>
                    ) : orders.map(order => {
                        const sm = STATUS_META[order.status] || STATUS_META.pending;
                        const services = typeof order.services === 'string' ? JSON.parse(order.services) : order.services;
                        return (
                            <Card key={order.id} style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{order.recipient_name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{order.recipient_city}, {order.recipient_country} · {order.recipient_phone}</div>
                                    </div>
                                    <div style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.color}40`, borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600 }}>
                                        {sm.label}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                                    {services.map(s => {
                                        const sc = SERVICE_CATS.find(c => c.key === s.category);
                                        return (
                                            <span key={s.category} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: 'var(--color-text)' }}>
                                                {sc?.icon} {sc?.label || s.category}
                                            </span>
                                        );
                                    })}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-subtle)', marginBottom: 12 }}>
                                    <span>Sent: {parseFloat(order.amount_sent).toFixed(2)} {order.currency_sent}</span>
                                    <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>₨{Number(order.total_pkr).toLocaleString()} in services</span>
                                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>

                                {order.proof_photo_url && (
                                    <div style={{ background: '#10b98110', border: '1px solid #10b98130', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                                        <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginBottom: 4 }}>✓ Proof of Service</div>
                                        <a href={order.proof_photo_url} target="_blank" rel="noopener noreferrer"
                                            style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none' }}>View proof photo →</a>
                                        {order.proof_notes && <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', margin: '4px 0 0' }}>{order.proof_notes}</p>}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {order.status === 'pending' && (
                                        <button onClick={() => updateStatus(order.id, 'scheduled')} style={{
                                            background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)',
                                            borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer',
                                        }}>Mark Scheduled</button>
                                    )}
                                    {order.status === 'scheduled' && (
                                        <button onClick={() => updateStatus(order.id, 'in_progress')} style={{
                                            background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)',
                                            borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer',
                                        }}>Mark In Progress</button>
                                    )}
                                    {['pending','scheduled','in_progress'].includes(order.status) && !order.proof_photo_url && (
                                        <button onClick={() => setProof(p => ({ ...p, orderId: order.id }))} style={{
                                            background: '#8b5cf6', color: '#fff', border: 'none',
                                            borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer',
                                        }}>Submit Proof</button>
                                    )}
                                </div>

                                {proof.orderId === order.id && (
                                    <div style={{ marginTop: 12, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12 }}>
                                        <div style={{ fontSize: 12, color: 'var(--color-text)', fontWeight: 600, marginBottom: 8 }}>Submit Proof of Service</div>
                                        <input value={proof.url} onChange={e => setProof(p => ({ ...p, url: e.target.value }))}
                                            placeholder="Photo URL (upload and paste link)" style={{ ...inputStyle, marginBottom: 8 }} />
                                        <textarea value={proof.notes} onChange={e => setProof(p => ({ ...p, notes: e.target.value }))}
                                            placeholder="Optional notes about the service..." rows={2}
                                            style={{ ...inputStyle, resize: 'vertical', marginBottom: 8 }} />
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => submitProof(order.id)} style={{
                                                background: '#8b5cf6', color: '#fff', border: 'none',
                                                borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                            }}>Submit</button>
                                            <button onClick={() => setProof({ url: '', notes: '', orderId: null })} style={{
                                                background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-subtle)',
                                                borderRadius: 6, padding: '7px 14px', fontSize: 12, cursor: 'pointer',
                                            }}>Cancel</button>
                                        </div>
                                        {proofMsg && <p style={{ fontSize: 12, color: 'var(--color-primary)', marginTop: 6 }}>{proofMsg}</p>}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
