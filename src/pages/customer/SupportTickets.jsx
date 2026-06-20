import { useState, useEffect } from 'react';
import { Plus, MessageSquare, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const STATUS_ICONS = { open: Clock, in_progress: AlertTriangle, resolved: CheckCircle };
const STATUS_STYLES = { open: 'bg-amber-100 text-amber-700', in_progress: 'bg-blue-100 text-blue-700', resolved: 'bg-emerald-100 text-emerald-700' };

export default function SupportTickets() {
    const [tickets, setTickets] = useState([]);
    const [dialog, setDialog] = useState(false);
    const [form, setForm] = useState({ subject: '', category: 'booking', priority: 'normal', description: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('support_tickets') || '[]');
        setTickets(stored);
    }, []);

    const submit = () => {
        if (!form.subject || !form.description) { toast.error('Subject and description required'); return; }
        setLoading(true);
        const ticket = { ...form, id: `TKT-${Date.now()}`, status: 'open', created_at: new Date().toISOString() };
        const updated = [ticket, ...tickets];
        setTickets(updated);
        localStorage.setItem('support_tickets', JSON.stringify(updated));
        setTimeout(() => {
            setLoading(false);
            setDialog(false);
            setForm({ subject: '', category: 'booking', priority: 'normal', description: '' });
            toast.success('Ticket submitted! We\'ll respond within 24 hours.');
        }, 600);
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display font-bold text-3xl tracking-tight">Support Tickets</h1>
                    <p className="text-zinc-500 text-sm mt-1">Track your support requests</p>
                </div>
                <Button className="rounded-xl gap-2" onClick={() => setDialog(true)}>
                    <Plus className="h-4 w-4" /> New Ticket
                </Button>
            </div>

            {tickets.length === 0 ? (
                <div className="card-premium p-12 text-center">
                    <MessageSquare className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
                    <p className="text-zinc-400 text-sm">No support tickets yet</p>
                    <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setDialog(true)}>Submit a ticket</Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {tickets.map(t => {
                        const Icon = STATUS_ICONS[t.status] || Clock;
                        return (
                            <div key={t.id} className="card-premium p-5 flex items-center gap-4">
                                <Icon className="h-5 w-5 text-zinc-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">{t.subject}</p>
                                    <p className="text-xs text-zinc-400">{t.id} · {t.category} · {new Date(t.created_at).toLocaleDateString()}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[t.status] || ''}`}>{t.status}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            <Dialog open={dialog} onOpenChange={setDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-1">
                        <Input placeholder="Subject *" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="rounded-xl" />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">Category</label>
                                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['booking', 'payment', 'provider', 'account', 'other'].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">Priority</label>
                                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['low', 'normal', 'high', 'urgent'].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Textarea placeholder="Describe your issue in detail *" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="rounded-xl resize-none" rows={4} />
                        <Button className="w-full h-11 rounded-xl" onClick={submit} disabled={loading}>{loading ? 'Submitting…' : 'Submit Ticket'}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}