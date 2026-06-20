import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowLeft, Layers, PlusCircle, Clock, DollarSign } from 'lucide-react';

const EMPTY = { name: '', description: '', type: 'addon', category: '', price_modifier: 0, duration_modifier: 0, is_active: true, sort_order: 0 };

const TYPE_INFO = {
    addon: { label: 'Add-on', color: 'bg-blue-50 text-blue-700 border-blue-200', desc: 'Stackable extras customers can add to their booking' },
    variant: { label: 'Variant', color: 'bg-violet-50 text-violet-700 border-violet-200', desc: 'Mutually exclusive options (pick one)' },
};

export default function ServiceVariants() {
    const { serviceId } = useParams();
    const [service, setService] = useState(null);
    const [variants, setVariants] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editId, setEditId] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setService(null);
        setVariants([]);
        setLoading(false);
    };

    useEffect(() => { load(); }, [serviceId]);

    const save = async () => {
        const data = {
            ...form,
            service_id: serviceId,
            provider_id: service?.provider_id,
            price_modifier: Number(form.price_modifier) || 0,
            duration_modifier: Number(form.duration_modifier) || 0,
            sort_order: Number(form.sort_order) || 0,
        };
        toast.success(editId ? 'Option updated' : 'Option added');
        setOpen(false); setForm(EMPTY); setEditId(null);
        load();
    };

    const del = async (id) => {
        setVariants(prev => prev.filter(v => v.id !== id));
        toast.success('Deleted');
    };

    const openEdit = (v) => { setForm(v); setEditId(v.id); setOpen(true); };

    if (loading) return (
        <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-wave h-16 rounded-2xl" />)}
        </div>
    );

    const grouped = { variant: variants.filter(v => v.type === 'variant'), addon: variants.filter(v => v.type === 'addon') };

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <Link to="/provider/services" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-900 transition-colors mb-4">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Services
                </Link>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="font-inter font-black text-2xl tracking-tight">Service Options</h1>
                        <p className="text-zinc-400 text-sm mt-0.5">
                            <span className="font-medium text-zinc-600">{service?.name}</span> · Configure add-ons and variants
                        </p>
                    </div>
                    <Button size="sm" className="rounded-xl gap-1.5 shrink-0" onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}>
                        <Plus className="h-4 w-4" /> Add Option
                    </Button>
                </div>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {Object.entries(TYPE_INFO).map(([type, info]) => (
                    <div key={type} className={`rounded-2xl border p-4 ${info.color}`}>
                        <p className="font-bold text-sm">{info.label}</p>
                        <p className="text-xs opacity-80 mt-0.5">{info.desc}</p>
                        <p className="text-2xl font-black mt-2">{grouped[type].length}</p>
                    </div>
                ))}
            </div>

            {variants.length === 0 ? (
                <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center shadow-premium">
                    <Layers className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
                    <p className="text-zinc-400 text-sm mb-4">No options yet. Add variants like haircut styles or add-ons like beard trims.</p>
                    <Button variant="outline" className="rounded-xl" onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}>
                        <PlusCircle className="h-4 w-4 mr-2" /> Add first option
                    </Button>
                </div>
            ) : (
                <div className="space-y-5">
                    {Object.entries(grouped).map(([type, items]) => items.length === 0 ? null : (
                        <div key={type}>
                            <h2 className="font-inter font-bold text-sm text-zinc-500 uppercase tracking-wider mb-2.5">
                                {TYPE_INFO[type].label}s
                            </h2>
                            <div className="space-y-2">
                                {items.map(v => (
                                    <div key={v.id} className="bg-white rounded-2xl border border-zinc-100 p-4 flex items-center gap-3 shadow-premium">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-semibold text-sm">{v.name}</span>
                                                {!v.is_active && <span className="text-[10px] bg-zinc-100 text-zinc-400 px-2 py-0.5 rounded-full font-medium">Inactive</span>}
                                            </div>
                                            {v.description && <p className="text-xs text-zinc-400 mb-1">{v.description}</p>}
                                            <div className="flex items-center gap-3">
                                                {v.price_modifier !== 0 && (
                                                    <span className="flex items-center gap-1 text-xs text-zinc-600">
                                                        <DollarSign className="h-3 w-3" />
                                                        {v.price_modifier > 0 ? '+' : ''}{v.price_modifier}
                                                    </span>
                                                )}
                                                {v.duration_modifier !== 0 && (
                                                    <span className="flex items-center gap-1 text-xs text-zinc-600">
                                                        <Clock className="h-3 w-3" />
                                                        {v.duration_modifier > 0 ? '+' : ''}{v.duration_modifier} min
                                                    </span>
                                                )}
                                                {v.category && <span className="text-xs text-zinc-400">{v.category}</span>}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => openEdit(v)}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-red-400 hover:text-red-600" onClick={() => del(v.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editId ? 'Edit' : 'Add'} Service Option</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-1">
                        <Input placeholder="Option name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-xl" />
                        <Textarea placeholder="Description (optional)" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="rounded-xl resize-none" rows={2} />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Type</label>
                                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="addon">Add-on (stackable)</SelectItem>
                                        <SelectItem value="variant">Variant (pick one)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Category</label>
                                <Select value={form.category || ''} onValueChange={v => setForm({ ...form, category: v })}>
                                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
                                    <SelectContent>
                                        {['haircut_style', 'beard', 'wash', 'styling', 'treatment', 'extra', 'package'].map(c => (
                                            <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Price Modifier ($)</label>
                                <Input type="number" placeholder="0" value={form.price_modifier || ''} onChange={e => setForm({ ...form, price_modifier: e.target.value })} className="rounded-xl" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Duration (+min)</label>
                                <Input type="number" placeholder="0" value={form.duration_modifier || ''} onChange={e => setForm({ ...form, duration_modifier: e.target.value })} className="rounded-xl" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 pt-1">
                            <Switch checked={form.is_active !== false} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                            <span className="text-sm font-medium">Active (visible to customers)</span>
                        </div>
                        <Button className="w-full rounded-xl h-11" onClick={save} disabled={!form.name}>
                            {editId ? 'Update Option' : 'Add Option'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}