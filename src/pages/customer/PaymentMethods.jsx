import { useState } from 'react';
import { CreditCard, Plus, Trash2, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const CARD_BRANDS = { visa: '💳 Visa', mastercard: '💳 Mastercard', amex: '💳 Amex', discover: '💳 Discover' };

export default function PaymentMethods() {
    const [cards, setCards] = useState([
        { id: '1', brand: 'visa', last4: '4242', expiry: '12/27', default: true },
    ]);
    const [dialog, setDialog] = useState(false);
    const [form, setForm] = useState({ number: '', expiry: '', cvv: '', name: '' });

    const addCard = () => {
        if (!form.number || !form.expiry || !form.cvv || !form.name) { toast.error('All fields required'); return; }
        const last4 = form.number.replace(/\s/g, '').slice(-4);
        const newCard = { id: Date.now().toString(), brand: 'visa', last4, expiry: form.expiry, default: cards.length === 0 };
        setCards(p => [...p, newCard]);
        setDialog(false);
        setForm({ number: '', expiry: '', cvv: '', name: '' });
        toast.success('Card added successfully');
    };

    const setDefault = (id) => {
        setCards(p => p.map(c => ({ ...c, default: c.id === id })));
        toast.success('Default card updated');
    };

    const remove = (id) => {
        setCards(p => p.filter(c => c.id !== id));
        toast.success('Card removed');
    };

    return (
        <div className="space-y-6 max-w-xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display font-bold text-3xl tracking-tight">Payment Methods</h1>
                    <p className="text-zinc-500 text-sm mt-1">Manage your saved payment methods</p>
                </div>
                <Button className="rounded-xl gap-2" onClick={() => setDialog(true)}><Plus className="h-4 w-4" /> Add Card</Button>
            </div>

            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <Shield className="h-4 w-4 text-blue-600 shrink-0" />
                <p className="text-xs text-blue-700">Your payment information is encrypted and secure. We never store full card numbers.</p>
            </div>

            {cards.length === 0 ? (
                <div className="card-premium p-12 text-center">
                    <CreditCard className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
                    <p className="text-zinc-400 text-sm">No payment methods saved</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {cards.map(c => (
                        <div key={c.id} className={`card-premium p-5 flex items-center gap-4 ${c.default ? 'ring-2 ring-zinc-900' : ''}`}>
                            <div className="h-12 w-16 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-600 flex items-center justify-center text-white text-xs font-bold">
                                •••• {c.last4}
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-sm">{CARD_BRANDS[c.brand] || 'Card'} ending in {c.last4}</p>
                                <p className="text-xs text-zinc-400">Expires {c.expiry}</p>
                                {c.default && <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold mt-0.5"><CheckCircle className="h-3 w-3" /> Default</span>}
                            </div>
                            <div className="flex gap-1">
                                {!c.default && <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => setDefault(c.id)}>Set Default</Button>}
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-red-400 hover:text-red-600" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={dialog} onOpenChange={setDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Add Payment Method</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-1">
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Cardholder Name</label>
                            <Input placeholder="John Smith" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Card Number</label>
                            <Input placeholder="1234 5678 9012 3456" value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} className="rounded-xl font-mono" maxLength={19} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Expiry</label>
                                <Input placeholder="MM/YY" value={form.expiry} onChange={e => setForm(p => ({ ...p, expiry: e.target.value }))} className="rounded-xl" maxLength={5} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">CVV</label>
                                <Input placeholder="123" value={form.cvv} onChange={e => setForm(p => ({ ...p, cvv: e.target.value }))} className="rounded-xl font-mono" maxLength={4} type="password" />
                            </div>
                        </div>
                        <Button className="w-full h-11 rounded-xl" onClick={addCard}>Add Card</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}