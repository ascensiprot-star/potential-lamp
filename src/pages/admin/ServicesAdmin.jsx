import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ServicesAdmin() {
    const [categories, setCategories] = useState([]);
    const [services, setServices] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ name: '', slug: '', description: '', icon: 'wrench' });
    const [loading, setLoading] = useState(true);

    const load = () => {
        setCategories([]); setServices([]); setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const addCat = async () => {
        toast.success('Category added');
        setOpen(false);
        setForm({ name: '', slug: '', description: '', icon: 'wrench' });
        load();
    };

    const delCat = async (id) => {
        toast.success('Deleted');
        load();
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="font-inter font-bold text-2xl">{"Services & Categories"}</h1>
                <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Category</Button>
            </div>

            <h2 className="font-inter font-semibold mb-3">Categories ({categories.length})</h2>
            <div className="space-y-2 mb-8">
                {categories.map(c => (
                    <div key={c.id} className="border border-border rounded-lg p-3 flex items-center justify-between">
                        <div>
                            <span className="font-medium text-sm">{c.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{c.slug}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => delCat(c.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                ))}
            </div>

            <h2 className="font-inter font-semibold mb-3">All Services ({services.length})</h2>
            <div className="space-y-2">
                {services.map(s => (
                    <div key={s.id} className="border border-border rounded-lg p-3 flex items-center justify-between">
                        <div>
                            <span className="font-medium text-sm">{s.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">${s.price} · {s.type}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{s.category_slug}</span>
                    </div>
                ))}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        <Input placeholder="Slug (e.g. barber)" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
                        <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        <Input placeholder="Icon (scissors, wrench, etc)" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} />
                        <Button className="w-full" onClick={addCat} disabled={!form.name || !form.slug}>Add</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}