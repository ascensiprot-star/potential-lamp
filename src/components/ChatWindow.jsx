import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, X, MessageCircle, Loader2 } from 'lucide-react';

/**
 * ChatWindow — real-time chat between customer and provider for a booking.
 * Props:
 *   providerId    — provider's record id
 *   customerEmail — customer's email
 *   currentUserEmail — logged-in user's email
 *   currentUserRole  — 'customer' | 'provider'
 *   providerName     — display name
 *   onClose          — optional close handler
 */
export default function ChatWindow({ providerId, customerEmail, currentUserEmail, currentUserRole, providerName, onClose }) {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!providerId || !customerEmail) return;
        setLoading(true);
            .then(msgs => { setMessages(msgs); setLoading(false); });

        // Subscribe to real-time updates
            if (event.type === 'create' && event.data.provider_id === providerId && event.data.customer_email === customerEmail) {
                setMessages(prev => {
                    if (prev.find(m => m.id === event.id)) return prev;
                    return [...prev, event.data];
                });
            }
        });
        return unsub;
    }, [providerId, customerEmail]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = async () => {
        const trimmed = text.trim();
        if (!trimmed || sending) return;
        setSending(true);
        setText('');
            provider_id: providerId,
            customer_email: customerEmail,
            sender_email: currentUserEmail,
            sender_role: currentUserRole,
            text: trimmed,
            is_read: false,
        });
        setSending(false);
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    return (
        <div className="flex flex-col h-full bg-background border border-border rounded-2xl overflow-hidden shadow-float">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                        <MessageCircle className="h-4 w-4 text-white dark:text-zinc-900" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">{currentUserRole === 'customer' ? providerName || 'Provider' : customerEmail}</p>
                        <p className="text-xs text-muted-foreground">Chat</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-muted-foreground">
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Say hello!</p>
                ) : (
                    messages.map(msg => {
                        const isMe = msg.sender_email === currentUserEmail;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe
                                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-br-sm'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm'
                                    }`}>
                                    {msg.text}
                                    <div className={`text-[10px] mt-1 ${isMe ? 'text-white/50 dark:text-zinc-500' : 'text-muted-foreground'}`}>
                                        {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border bg-card shrink-0">
                <div className="flex gap-2">
                    <Input
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Type a message..."
                        className="rounded-xl flex-1 text-sm"
                        disabled={sending}
                    />
                    <Button onClick={send} disabled={!text.trim() || sending} className="h-9 w-9 rounded-xl p-0 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 shrink-0">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}