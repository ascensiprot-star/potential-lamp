import { useState } from 'react';
import { Gift, Send, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const AMOUNTS = [25, 50, 100, 150, 200, 500];

export default function GiftCards() {
    const [tab, setTab] = useState('send');
    const [amount, setAmount] = useState(50);
    const [customAmount, setCustomAmount] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [message, setMessage] = useState('');
    const [redeemCode, setRedeemCode] = useState('');
    const [sending, setSending] = useState(false);

    const selectedAmount = customAmount ? Number(customAmount) : amount;

    const sendGift = async () => {
        if (!recipientEmail || !selectedAmount) { toast.error('Email and amount required'); return; }
        setSending(true);
        await new Promise(r => setTimeout(r, 1000));
        setSending(false);
        toast.success(`Gift card sent to ${recipientEmail}!`);
        setRecipientEmail(''); setRecipientName(''); setMessage('');
    };

    const redeem = () => {
        if (!redeemCode) { toast.error('Enter a gift card code'); return; }
        toast.success('Gift card redeemed! $50 added to your account credits.');
        setRedeemCode('');
    };

    const inputStyle = {
        width: '100%', height: 40, padding: '0 12px', borderRadius: 10, fontSize: 13,
        backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border-strong)',
        color: 'var(--color-text)', outline: 'none', fontFamily: 'Inter,sans-serif',
        transition: 'border-color 0.18s',
    };

    return (
        <div className="space-y-5 max-w-xl">
            <div>
                <h1 className="font-black text-2xl tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>Gift Cards</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Give the gift of great service</p>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)' }}>
                {[['send', 'Send Gift Card'], ['redeem', 'Redeem Code']].map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className="flex-1 h-8 rounded-lg text-xs font-semibold transition-all"
                        style={{
                            backgroundColor: tab === key ? 'var(--color-primary)' : 'transparent',
                            color: tab === key ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                            border: 'none', cursor: 'pointer',
                        }}>
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'send' && (
                <div className="space-y-5">
                    {/* Gift card preview */}
                    <div className="rounded-2xl p-7 shimmer" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-accent)', boxShadow: 'var(--shadow-card-hover)' }}>
                        <Gift className="h-7 w-7 mb-3" style={{ color: 'var(--color-text-muted)' }} />
                        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-subtle)' }}>Gift Card Value</p>
                        <p className="font-black text-5xl" style={{ color: 'var(--color-primary)', letterSpacing: '-0.05em' }}>${selectedAmount}</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Truvornex Services Gift Card</p>
                    </div>

                    {/* Amount selector */}
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--color-text-subtle)' }}>Select Amount</p>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {AMOUNTS.map(a => {
                                const selected = amount === a && !customAmount;
                                return (
                                    <button key={a} onClick={() => { setAmount(a); setCustomAmount(''); }}
                                        className="h-10 rounded-xl text-sm font-bold transition-all"
                                        style={{
                                            backgroundColor: selected ? 'var(--color-primary)' : 'var(--color-surface-high)',
                                            color: selected ? 'var(--color-on-primary)' : 'var(--color-text)',
                                            border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
                                            cursor: 'pointer',
                                        }}>
                                        ${a}
                                    </button>
                                );
                            })}
                        </div>
                        <input placeholder="Custom amount" type="number" value={customAmount}
                            onChange={e => setCustomAmount(e.target.value)}
                            style={{ ...inputStyle }}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-border-accent)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')} />
                    </div>

                    {/* Recipient fields */}
                    <div className="space-y-2.5">
                        {[
                            { placeholder: 'Recipient email *', type: 'email', value: recipientEmail, set: setRecipientEmail },
                            { placeholder: 'Recipient name (optional)', type: 'text', value: recipientName, set: setRecipientName },
                        ].map(f => (
                            <input key={f.placeholder} placeholder={f.placeholder} type={f.type} value={f.value}
                                onChange={e => f.set(e.target.value)}
                                style={{ ...inputStyle }}
                                onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-border-accent)')}
                                onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')} />
                        ))}
                        <textarea placeholder="Personal message (optional)" value={message} onChange={e => setMessage(e.target.value)}
                            rows={3}
                            style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'none' }} />
                    </div>

                    <button className="w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: 'pointer' }}
                        onClick={sendGift} disabled={sending}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        <Send className="h-4 w-4" /> {sending ? 'Sending…' : `Send $${selectedAmount} Gift Card`}
                    </button>
                </div>
            )}

            {tab === 'redeem' && (
                <div className="space-y-4">
                    <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <CreditCard className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--color-text-subtle)' }} />
                        <h2 className="font-bold text-base mb-1.5" style={{ color: 'var(--color-primary)' }}>Redeem a Gift Card</h2>
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Enter your gift card code below to add credits to your account</p>
                    </div>
                    <input placeholder="Gift card code (e.g. TRV-XXXX-XXXX)"
                        value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                        style={{ ...inputStyle, height: 48, textAlign: 'center', fontSize: 14, fontFamily: 'monospace', letterSpacing: '0.05em' }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-border-accent)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')} />
                    <button className="w-full h-11 rounded-xl text-sm font-semibold transition-all"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: 'pointer' }}
                        onClick={redeem}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        Redeem Gift Card
                    </button>
                </div>
            )}
        </div>
    );
}
