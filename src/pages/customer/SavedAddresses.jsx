import { useState, useEffect } from 'react';
import { MapPin, Plus, Pencil, Trash2, Home, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

const ADDR_TYPES = [
    { value: 'home',  label: 'Home',  icon: Home },
    { value: 'work',  label: 'Work',  icon: Briefcase },
    { value: 'other', label: 'Other', icon: MapPin },
];

const inputStyle = {
    width: '100%', height: 40, padding: '0 12px', borderRadius: 10, fontSize: 13,
    backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border-strong)',
    color: 'var(--color-text)', outline: 'none', fontFamily: 'Inter,sans-serif',
};

export default function SavedAddresses() {
    const [addresses, setAddresses] = useState([]);
    const [dialog, setDialog] = useState(false);
    const [form, setForm] = useState({ label: 'home', address: '', notes: '' });
    const [editId, setEditId] = useState(null);

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('saved_addresses') || '[]');
        setAddresses(stored);
    }, []);

    const save = () => {
        if (!form.address) { toast.error('Address is required'); return; }
        let updated;
        if (editId) {
            updated = addresses.map(a => a.id === editId ? { ...a, ...form } : a);
        } else {
            updated = [...addresses, { ...form, id: Date.now().toString() }];
        }
        setAddresses(updated);
        localStorage.setItem('saved_addresses', JSON.stringify(updated));
        toast.success(editId ? 'Address updated' : 'Address saved');
        setDialog(false); setEditId(null);
        setForm({ label: 'home', address: '', notes: '' });
    };

    const del = (id) => {
        const updated = addresses.filter(a => a.id !== id);
        setAddresses(updated);
        localStorage.setItem('saved_addresses', JSON.stringify(updated));
        toast.success('Address removed');
    };

    const openEdit = (a) => {
        setForm({ label: a.label, address: a.address, notes: a.notes || '' });
        setEditId(a.id); setDialog(true);
    };

    return (
        <div className="space-y-5 max-w-xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-black text-2xl tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>Saved Addresses</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Quick-fill your addresses when booking</p>
                </div>
                <button className="h-9 px-4 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: 'pointer' }}
                    onClick={() => { setEditId(null); setForm({ label: 'home', address: '', notes: '' }); setDialog(true); }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                    <Plus className="h-4 w-4" /> Add Address
                </button>
            </div>

            {addresses.length === 0 ? (
                <div className="rounded-xl p-12 text-center" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <MapPin className="h-9 w-9 mx-auto mb-3" style={{ color: 'var(--color-text-subtle)' }} />
                    <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>No saved addresses yet</p>
                    <button className="h-9 px-4 rounded-xl text-sm font-semibold transition-all"
                        style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text)', border: '1px solid var(--color-border-strong)', cursor: 'pointer' }}
                        onClick={() => setDialog(true)}>
                        Add your first address
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {addresses.map(a => {
                        const type = ADDR_TYPES.find(t => t.value === a.label) || ADDR_TYPES[2];
                        const Icon = type.icon;
                        return (
                            <div key={a.id} className="rounded-xl p-4 flex items-center gap-3 shimmer"
                                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
                                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)' }}>
                                    <Icon className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm capitalize" style={{ color: 'var(--color-primary)' }}>{type.label}</p>
                                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{a.address}</p>
                                    {a.notes && <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{a.notes}</p>}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button className="h-8 w-8 rounded-xl flex items-center justify-center transition-all"
                                        style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                                        onClick={() => openEdit(a)}
                                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)')}
                                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                                        <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
                                    </button>
                                    <button className="h-8 w-8 rounded-xl flex items-center justify-center transition-all"
                                        style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                                        onClick={() => del(a.id)}
                                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(252,165,165,0.1)', e.currentTarget.style.borderColor = 'rgba(252,165,165,0.3)')}
                                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.borderColor = 'var(--color-border)')}>
                                        <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--color-error)' }} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Dialog */}
            {dialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
                    onClick={e => e.target === e.currentTarget && setDialog(false)}>
                    <div className="w-full max-w-sm rounded-2xl p-5 space-y-4"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-float)' }}>
                        <h2 className="font-bold text-base" style={{ color: 'var(--color-primary)' }}>{editId ? 'Edit' : 'Add'} Address</h2>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: 'var(--color-text-subtle)' }}>Type</label>
                            <div className="flex gap-2">
                                {ADDR_TYPES.map(t => {
                                    const active = form.label === t.value;
                                    return (
                                        <button key={t.value} onClick={() => setForm(p => ({ ...p, label: t.value }))}
                                            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                                            style={{
                                                backgroundColor: active ? 'var(--color-primary)' : 'var(--color-surface-high)',
                                                color: active ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                                                border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
                                                cursor: 'pointer',
                                            }}>
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <input placeholder="Full address *" value={form.address}
                            onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                            style={inputStyle}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-border-accent)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')} />
                        <input placeholder="Notes (optional)" value={form.notes}
                            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                            style={inputStyle}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-border-accent)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')} />

                        <div className="flex gap-2">
                            <button className="flex-1 h-10 rounded-xl text-sm font-semibold transition-all"
                                style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-strong)', cursor: 'pointer' }}
                                onClick={() => setDialog(false)}>
                                Cancel
                            </button>
                            <button className="flex-1 h-10 rounded-xl text-sm font-semibold transition-all"
                                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: 'pointer' }}
                                onClick={save}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                                {editId ? 'Update' : 'Save'} Address
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
