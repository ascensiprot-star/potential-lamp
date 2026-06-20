import { useState, useEffect } from 'react';
import { FileText, Search, Download, DollarSign, Clock, AlertTriangle, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATUS_STYLES = {
    paid: 'bg-emerald-100 text-emerald-700',
    issued: 'bg-blue-100 text-blue-700',
    overdue: 'bg-red-100 text-red-700',
    draft: 'bg-zinc-100 text-zinc-600',
    void: 'bg-zinc-100 text-zinc-400',
    refunded: 'bg-amber-100 text-amber-700',
};

export default function InvoiceManagement() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        setInvoices([]);
        setLoading(false);
    }, []);

    const filtered = invoices.filter(inv => {
        const matchSearch = !search || inv.customer_email?.toLowerCase().includes(search.toLowerCase()) || inv.invoice_number?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total_amount || 0), 0);
    const outstanding = invoices.filter(i => ['issued', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.total_amount || 0), 0);

    const markPaid = async (id) => {
        setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid' } : i));
        toast.success('Invoice marked as paid');
    };

    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-inter font-black text-2xl tracking-tight">Invoice Management</h1>
                    <p className="text-zinc-400 text-sm">All platform invoices and billing records</p>
                </div>
                <Button className="rounded-xl gap-2"><Plus className="h-4 w-4" /> Create Invoice</Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Invoices', value: invoices.length, icon: FileText },
                    { label: 'Revenue Collected', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign },
                    { label: 'Outstanding', value: `$${outstanding.toLocaleString()}`, icon: Clock },
                    { label: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length, icon: AlertTriangle },
                ].map(k => (
                    <div key={k.label} className="card-premium p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{k.label}</span>
                            <k.icon className="h-4 w-4 text-zinc-400" />
                        </div>
                        <p className="font-black text-3xl text-zinc-900">{k.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices…" className="pl-9 rounded-xl" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="rounded-xl w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {['all', 'paid', 'issued', 'overdue', 'draft', 'void', 'refunded'].map(s => <SelectItem key={s} value={s} className="capitalize">{s === 'all' ? 'All Status' : s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton-wave h-16 rounded-2xl" />)}</div>
            ) : (
                <div className="card-premium overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                            <tr>
                                <th className="text-left px-5 py-3">Invoice</th>
                                <th className="text-left px-5 py-3">Customer</th>
                                <th className="text-right px-5 py-3">Amount</th>
                                <th className="text-right px-5 py-3">Due Date</th>
                                <th className="text-right px-5 py-3">Status</th>
                                <th className="text-right px-5 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {filtered.map(inv => (
                                <tr key={inv.id} className="hover:bg-zinc-50 transition-colors">
                                    <td className="px-5 py-3 font-mono text-xs font-semibold">{inv.invoice_number || `INV-${inv.id?.slice(0, 6)}`}</td>
                                    <td className="px-5 py-3 text-zinc-600 text-xs">{inv.customer_email}</td>
                                    <td className="px-5 py-3 text-right font-bold">${(inv.total_amount || 0).toFixed(2)}</td>
                                    <td className="px-5 py-3 text-right text-zinc-500 text-xs">{inv.due_date || '—'}</td>
                                    <td className="px-5 py-3 text-right">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[inv.status] || ''}`}>{inv.status}</span>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            {inv.status === 'issued' && <Button size="sm" variant="outline" className="rounded-lg h-7 text-xs" onClick={() => markPaid(inv.id)}>Mark Paid</Button>}
                                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"><Download className="h-3 w-3" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && <div className="p-10 text-center text-zinc-400 text-sm">No invoices found</div>}
                </div>
            )}
        </div>
    );
}