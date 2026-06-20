import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

const EMPTY = { name: '', slug: '', description: '', icon: 'wrench', is_active: true, sort_order: 0 };

export default function CategoryManagement() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        const { data } = await supabase.from('service_categories').select('*').order('sort_order', { ascending: true });
        if (data) setCategories(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const save = async () => {
        if (!form.name || !form.slug) { toast.error('Name and slug are required'); return; }
        setSaving(true);
        toast.success(editId ? 'Category updated' : 'Category created');
        setSaving(false);
        setDialog(false);
        setEditId(null);
        setForm(EMPTY);
        load();
    };

    const del = async (id) => {
        setCategories(prev => prev.filter(c => c.id !== id));
        toast.success('Category deleted');
    };

    const toggleActive = async (cat) => {
        setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: !c.is_active } : c));
    };

    const openEdit = (cat) => { setForm({ name: cat.name, slug: cat.slug, description: cat.description || '', icon: cat.icon || 'wrench', is_active: cat.is_active, sort_order: cat.sort_order || 0 }); setEditId(cat.id); setDialog(true); };

    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-inter font-black text-2xl tracking-tight">Category Management</h1>
                    <p className="text-zinc-400 text-sm">{categories.length} categories · {categories.filter(c => c.is_active).length} active</p>
                </div>
                <Button className="rounded-xl gap-2" onClick={() => { setEditId(null); setForm(EMPTY); setDialog(true); }}>
                    <Plus className="h-4 w-4" /> Add Category
                </Button>
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton-wave h-14 rounded-2xl" />)}</div>
            ) : (
                <div className="card-premium overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                            <tr>
                                <th className="text-left px-5 py-3">Category</th>
                                <th className="text-left px-5 py-3">Slug</th>
                                <th className="text-center px-5 py-3">Sort Order</th>
                                <th className="text-center px-5 py-3">Status</th>
                                <th className="text-right px-5 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {categories.map(cat => (
                                <tr key={cat.id} className="hover:bg-zinc-50 transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center text-sm">{cat.icon || '🔧'}</div>
                                            <div>
                                                <p className="font-semibold">{cat.name}</p>
                                                {cat.description && <p className="text-xs text-zinc-400 truncate max-w-[200px]">{cat.description}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 font-mono text-xs text-zinc-500">{cat.slug}</td>
                                    <td className="px-5 py-3 text-center text-zinc-500">{cat.sort_order || 0}</td>
                                    <td className="px-5 py-3 text-center">
                                        <Switch checked={!!cat.is_active} onCheckedChange={() => toggleActive(cat)} />
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => openEdit(cat)}><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-red-400 hover:text-red-600" onClick={() => del(cat.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog open={dialog} onOpenChange={setDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Category</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-1">
                        <Input placeholder="Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl" />
                        <Input placeholder="Slug * (e.g. plumbing)" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} className="rounded-xl font-mono" />
                        <Input placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="rounded-xl" />
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="Icon (emoji or name)" value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} className="rounded-xl" />
                            <Input type="number" placeholder="Sort Order" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))} className="rounded-xl" />
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                            <span className="text-sm font-medium">Active</span>
                        </div>
                        <Button className="w-full h-11 rounded-xl" onClick={save} disabled={saving}>{saving ? 'Saving…' : editId ? 'Update Category' : 'Create Category'}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}