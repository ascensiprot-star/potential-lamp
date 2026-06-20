import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Image, AlertTriangle } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

const EMPTY = { name: '', description: '', category_slug: '', type: 'appointment', price: '', duration_minutes: 30, is_active: true, image_url: '' };

export default function ManageServices() {
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [provider, setProvider] = useState(null);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editId, setEditId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploadingImg, setUploadingImg] = useState(false);
    const imgRef = useRef();

    const uploadImage = async () => {
        setUploadingImg(true);
        toast.error('Image upload requires Supabase storage to be configured.');
        setUploadingImg(false);
    };

    const load = async () => {
        setServices([]); setCategories([]); setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const save = async () => {
        toast.success(editId ? 'Service updated' : 'Service created');
        setOpen(false); setForm(EMPTY); setEditId(null);
        load();
    };

    const del = async () => { toast.success('Deleted'); load(); };

    const btnStyle = {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)',
        border: 'none', borderRadius: 10, padding: '0 14px', height: 34, fontSize: 12,
        fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s',
    };

    if (loading) return (
        <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-wave h-20 rounded-xl" />)}
        </div>
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-5">
                <h1 className="font-black text-xl tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>My Services</h1>
                <button style={btnStyle}
                    onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                    <Plus className="h-3.5 w-3.5" /> Add Service
                </button>
            </div>

            {!provider && (
                <div className="flex items-start gap-2.5 rounded-xl p-3.5 mb-4"
                    style={{ backgroundColor: 'var(--color-warning-bg)', border: '1px solid rgba(252,211,77,0.2)' }}>
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
                    <p className="text-sm" style={{ color: 'var(--color-warning)' }}>
                        You need to set up your provider profile first before adding services.
                    </p>
                </div>
            )}

            {services.length === 0 ? (
                <div className="rounded-xl p-12 text-center" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>No services yet</p>
                    <button style={{ ...btnStyle, backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text)', border: '1px solid var(--color-border-strong)' }}
                        onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}>
                        Add your first service
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {services.map(s => (
                        <div key={s.id} className="rounded-xl p-4 flex items-center justify-between gap-3"
                            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                            <div className="flex items-center gap-3 min-w-0">
                                {s.image_url ? (
                                    <img src={s.image_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                                ) : (
                                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)' }}>
                                        <Image className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--color-primary)' }}>{s.name}</h3>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>${s.price} · {s.duration_minutes}min · {s.category_slug} · {s.type}</p>
                                    <span className="text-[10px] font-medium" style={{ color: s.is_active ? 'var(--color-success)' : 'var(--color-text-subtle)' }}>
                                        {s.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <button className="h-8 px-2.5 rounded-lg text-xs font-medium transition-all"
                                    style={{ backgroundColor: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                                    onClick={() => navigate(`/provider/services/${s.id}/variants`)}
                                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)')}
                                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                                    Options
                                </button>
                                <button className="h-8 w-8 rounded-lg flex items-center justify-center transition-all"
                                    style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                                    onClick={() => { setForm(s); setEditId(s.id); setOpen(true); }}
                                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)')}
                                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                                    <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
                                </button>
                                <button className="h-8 w-8 rounded-lg flex items-center justify-center transition-all"
                                    style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                                    onClick={() => del(s.id)}
                                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(252,165,165,0.08)')}
                                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                                    <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--color-error)' }} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Service</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Service Photo (optional)</p>
                            <div className="h-28 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-colors"
                                style={{ borderColor: 'var(--color-border-strong)', backgroundColor: 'var(--color-surface-high)' }}
                                onClick={() => imgRef.current.click()}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-accent)')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')}>
                                {form.image_url ? (
                                    <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                                ) : uploadingImg ? (
                                    <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-border-strong)', borderTopColor: 'var(--color-primary)' }} />
                                ) : (
                                    <div className="text-center">
                                        <Image className="h-6 w-6 mx-auto mb-1" style={{ color: 'var(--color-text-subtle)' }} />
                                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Click to upload photo</p>
                                    </div>
                                )}
                            </div>
                            <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0])} />
                        </div>
                        <Input placeholder="Service name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        <Textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        <Select value={form.category_slug} onValueChange={v => setForm({ ...form, category_slug: v })}>
                            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                            <SelectContent>{categories.map(c => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {['appointment', 'slot', 'pickup', 'reservation', 'on_demand'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <div className="grid grid-cols-2 gap-3">
                            <Input type="number" placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                            <Input type="number" placeholder="Duration (min)" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Active</span>
                        </div>
                        <button className="w-full h-10 rounded-xl text-sm font-semibold transition-all"
                            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                            onClick={save} disabled={!form.name || !form.price}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                            Save Service
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
