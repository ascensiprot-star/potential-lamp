import { useState, useEffect } from 'react';
import { Bell, Send, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function AdminNotificationCenter() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState(false);
    const [form, setForm] = useState({ title: '', body: '', type: 'system_alert', recipient_role: 'customer', priority: 'normal' });
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        setNotifications([]);
        setLoading(false);
    }, []);

    const send = async () => {
        if (!form.title || !form.body) { toast.error('Title and body required'); return; }
        setSending(true);
        toast.success('Notification sent');
        setSending(false);
        setDialog(false);
    };

    const del = async (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast.success('Notification deleted');
    };

    const filtered = notifications.filter(n => !search || n.title?.toLowerCase().includes(search.toLowerCase()));

    const PRIORITY_STYLES = { urgent: 'bg-red-100 text-red-700', high: 'bg-amber-100 text-amber-700', normal: 'bg-blue-100 text-blue-700', low: 'bg-zinc-100 text-zinc-600' };

    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-inter font-black text-2xl tracking-tight">Notification Center</h1>
                    <p className="text-zinc-400 text-sm">Broadcast messages and manage platform notifications</p>
                </div>
                <Button className="rounded-xl gap-2" onClick={() => setDialog(true)}>
                    <Send className="h-4 w-4" /> Broadcast Notification
                </Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Sent', value: notifications.length },
                    { label: 'Unread', value: notifications.filter(n => !n.is_read).length },
                    { label: 'Urgent', value: notifications.filter(n => n.priority === 'urgent').length },
                    { label: 'This Week', value: notifications.filter(n => new Date(n.created_date) > new Date(Date.now() - 7 * 864e5)).length },
                ].map(k => (
                    <div key={k.label} className="card-premium p-4 text-center">
                        <p className="font-black text-3xl text-zinc-900">{k.value}</p>
                        <p className="text-xs text-zinc-400 mt-1">{k.label}</p>
                    </div>
                ))}
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notifications…" className="pl-9 rounded-xl" />
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-wave h-16 rounded-2xl" />)}</div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(n => (
                        <div key={n.id} className="card-premium p-4 flex items-center gap-4">
                            <Bell className={`h-4.5 w-4.5 shrink-0 ${n.priority === 'urgent' ? 'text-red-500' : 'text-zinc-400'}`} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="font-semibold text-sm truncate">{n.title}</p>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_STYLES[n.priority] || ''}`}>{n.priority}</span>
                                </div>
                                <p className="text-xs text-zinc-400 truncate">{n.body}</p>
                                <p className="text-[10px] text-zinc-300 mt-0.5">{n.recipient_role} · {n.created_date?.slice(0, 10)}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-red-400 hover:text-red-600 shrink-0" onClick={() => del(n.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                    {filtered.length === 0 && <div className="card-premium p-10 text-center text-zinc-400 text-sm">No notifications</div>}
                </div>
            )}

            <Dialog open={dialog} onOpenChange={setDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Broadcast Notification</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-1">
                        <Input placeholder="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="rounded-xl" />
                        <Textarea placeholder="Message body *" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} className="rounded-xl resize-none" rows={3} />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Send To</label>
                                <Select value={form.recipient_role} onValueChange={v => setForm(p => ({ ...p, recipient_role: v }))}>
                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="customer">All Customers</SelectItem>
                                        <SelectItem value="provider">All Providers</SelectItem>
                                        <SelectItem value="admin">Admins</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Priority</label>
                                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['low', 'normal', 'high', 'urgent'].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button className="w-full h-11 rounded-xl gap-2" onClick={send} disabled={sending}>
                            <Send className="h-4 w-4" /> {sending ? 'Sending…' : 'Send Notification'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}