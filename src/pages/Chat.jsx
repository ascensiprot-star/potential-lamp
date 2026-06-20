import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Loader2, Users, Send, Search, Plus, X, Check, CheckCheck, Phone, MoreVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Chat() {
    const [user, setUser] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [selected, setSelected] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [msgLoading, setMsgLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState('');
    const [newChatOpen, setNewChatOpen] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [userResults, setUserResults] = useState([]);
    const [userSearching, setUserSearching] = useState(false);
    const bottomRef = useRef(null);
    const pollRef = useRef(null);
    const location = useLocation();

    const params = new URLSearchParams(location.search);
    const deepLinkUserId = params.get('userId') || params.get('user_id');

    const fetchConversations = useCallback(async () => {
        try {
            const r = await fetch('/api/chat/conversations', { credentials: 'include' });
            const data = await r.json();
            if (data.conversations) setConversations(data.conversations);
        } catch (_) {}
    }, []);

    const loadMessages = useCallback(async (conv) => {
        if (!conv?.thread_key) return;
        setMsgLoading(true);
        try {
            const r = await fetch(`/api/chat/messages/${encodeURIComponent(conv.thread_key)}`, { credentials: 'include' });
            const data = await r.json();
            if (data.messages) {
                setMessages(data.messages);
                setConversations(prev => prev.map(c => c.thread_key === conv.thread_key ? { ...c, unread_count: '0' } : c));
            }
        } catch (_) {}
        setMsgLoading(false);
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                const r = await fetch('/api/auth/user', { credentials: 'include' });
                const d = await r.json();
                if (!d.user) { setLoading(false); return; }
                setUser(d.user);
                const cr = await fetch('/api/chat/conversations', { credentials: 'include' });
                const cd = await cr.json();
                const convos = cd.conversations || [];
                setConversations(convos);
                if (deepLinkUserId) {
                    // Make thread_key and find/create conversation
                    const threadKey = [d.user.id, deepLinkUserId].sort().join('_');
                    const existing = convos.find(c => c.thread_key === threadKey);
                    if (existing) {
                        setSelected(existing);
                    } else {
                        const ur = await fetch(`/api/chat/users?q=`, { credentials: 'include' });
                        const ud = await ur.json();
                        const other = ud.users?.find(u => u.id === deepLinkUserId);
                        if (other) {
                            const pseudoConv = { thread_key: threadKey, other_user_id: deepLinkUserId, other_user_name: other.full_name || other.email, unread_count: 0, last_message: '' };
                            setSelected(pseudoConv);
                        }
                    }
                } else if (convos.length) {
                    setSelected(convos[0]);
                }
            } catch (_) {}
            setLoading(false);
        };
        init();
    }, [deepLinkUserId]);

    // Load messages when conversation selected
    useEffect(() => {
        if (!selected) return;
        loadMessages(selected);
    }, [selected?.thread_key, loadMessages]);

    // Real-time polling every 3s
    useEffect(() => {
        if (!selected || !user) return;
        const poll = async () => {
            try {
                const r = await fetch(`/api/chat/messages/${encodeURIComponent(selected.thread_key)}`, { credentials: 'include' });
                const d = await r.json();
                if (d.messages && d.messages.length !== messages.length) {
                    setMessages(d.messages);
                }
            } catch (_) {}
        };
        pollRef.current = setInterval(poll, 3000);
        return () => clearInterval(pollRef.current);
    }, [selected?.thread_key, user, messages.length]);

    // Poll conversations for unread count
    useEffect(() => {
        if (!user) return;
        const pollConvos = setInterval(fetchConversations, 8000);
        return () => clearInterval(pollConvos);
    }, [user, fetchConversations]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = async () => {
        const trimmed = text.trim();
        if (!trimmed || sending || !selected || !user) return;
        setSending(true);
        setText('');
        // Optimistic
        const optimistic = { id: `opt-${Date.now()}`, sender_id: user.id, receiver_id: selected.other_id, thread_key: selected.thread_key, content: trimmed, type: 'text', read: false, created_at: new Date().toISOString() };
        setMessages(prev => [...prev, optimistic]);
        try {
            const r = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ receiver_id: selected.other_id || selected.other_user_id, content: trimmed }),
            });
            const d = await r.json();
            if (d.message) {
                setMessages(prev => prev.map(m => m.id === optimistic.id ? d.message : m));
                fetchConversations();
            } else {
                toast.error(d.error || 'Failed to send');
                setMessages(prev => prev.filter(m => m.id !== optimistic.id));
            }
        } catch (_) {
            toast.error('Network error');
            setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        }
        setSending(false);
    };

    const searchUsers = async (q) => {
        setUserSearch(q);
        if (!q.trim()) { setUserResults([]); return; }
        setUserSearching(true);
        try {
            const r = await fetch(`/api/chat/users?q=${encodeURIComponent(q)}`, { credentials: 'include' });
            const d = await r.json();
            setUserResults(d.users || []);
        } catch (_) {}
        setUserSearching(false);
    };

    const startChat = (otherUser) => {
        const threadKey = [user.id, otherUser.id].sort().join('_');
        const existing = conversations.find(c => c.thread_key === threadKey);
        if (existing) {
            setSelected(existing);
        } else {
            const newConv = { thread_key: threadKey, other_user_id: otherUser.id, other_user_name: otherUser.full_name || otherUser.email, unread_count: 0, last_message: '' };
            setConversations(prev => [newConv, ...prev]);
            setSelected(newConv);
        }
        setNewChatOpen(false);
        setUserSearch('');
        setUserResults([]);
    };

    const filteredConvos = conversations.filter(c => {
        const label = c.other_user_name || c.other_name || c.other_email || '';
        return !search || label.toLowerCase().includes(search.toLowerCase());
    });

    const formatTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        return isToday ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const getInitial = (name, email) => ((name || email || '?').charAt(0).toUpperCase());

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-text-subtle)' }} />
        </div>
    );
    if (!user) return (
        <div className="text-center py-20" style={{ color: 'var(--color-text-subtle)' }}>
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Please log in to use messages</p>
        </div>
    );

    return (
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <div className="flex items-center justify-between mb-5">
                <h1 className="font-display font-bold text-2xl tracking-tight flex items-center gap-2"
                    style={{ color: 'var(--color-text)' }}>
                    <MessageCircle className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
                    Messages
                </h1>
                <button onClick={() => setNewChatOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                    <Plus className="h-3.5 w-3.5" /> New Chat
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ height: '76vh' }}>
                {/* Sidebar */}
                <div className="md:col-span-1 rounded-2xl overflow-hidden flex flex-col"
                    style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <div className="p-2.5 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--color-text-subtle)' }} />
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search conversations…"
                                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none"
                                style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredConvos.length === 0 ? (
                            <div className="p-8 text-center">
                                <Users className="h-7 w-7 mx-auto mb-2 opacity-20" style={{ color: 'var(--color-text-subtle)' }} />
                                <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>No conversations yet</p>
                                <button onClick={() => setNewChatOpen(true)} className="text-xs mt-2 font-semibold" style={{ color: 'var(--color-primary)' }}>
                                    Start chatting →
                                </button>
                            </div>
                        ) : filteredConvos.map((c, i) => {
                            const isActive = selected?.thread_key === c.thread_key;
                            const unread = parseInt(c.unread_count || 0);
                            return (
                                <button key={c.thread_key} onClick={() => setSelected(c)}
                                    className="w-full text-left p-3 transition-colors"
                                    style={{
                                        borderBottom: '1px solid var(--color-border)',
                                        backgroundColor: isActive ? 'var(--color-surface-high)' : 'transparent',
                                    }}
                                    onMouseEnter={e => !isActive && (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)')}
                                    onMouseLeave={e => !isActive && (e.currentTarget.style.backgroundColor = 'transparent')}>
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                                            {getInitial(c.other_user_name || c.other_name, c.other_email)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                                                    {c.other_user_name || c.other_name || c.other_email || 'Unknown'}
                                                </p>
                                                <span className="text-[10px] shrink-0 ml-1" style={{ color: 'var(--color-text-subtle)' }}>
                                                    {formatTime(c.last_message_at)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-[11px] truncate" style={{ color: 'var(--color-text-subtle)' }}>
                                                    {c.last_message || 'Say hello!'}
                                                </p>
                                                {unread > 0 && (
                                                    <span className="h-4.5 min-w-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ml-1"
                                                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                                                        {unread}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Chat area */}
                <div className="md:col-span-2 flex flex-col rounded-2xl overflow-hidden"
                    style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    {selected ? (
                        <>
                            {/* Header */}
                            <div className="flex items-center gap-3 px-4 py-3 shrink-0"
                                style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                                <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                                    {getInitial(selected.other_user_name || selected.other_name, selected.other_email)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                                        {selected.other_user_name || selected.other_name || selected.other_email || 'Unknown'}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                                        {selected.other_email || ''}
                                    </p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0"
                                style={{ backgroundImage: 'radial-gradient(var(--color-border) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                                {msgLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-text-subtle)' }} />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-sm" style={{ color: 'var(--color-text-subtle)' }}>
                                            No messages yet. Say hello! 👋
                                        </p>
                                    </div>
                                ) : messages.map(msg => {
                                    const isMe = msg.sender_id === user.id;
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            {!isMe && (
                                                <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mr-1.5 mt-auto mb-4"
                                                    style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-subtle)', border: '1px solid var(--color-border)' }}>
                                                    {getInitial(selected.other_user_name || selected.other_name, selected.other_email)}
                                                </div>
                                            )}
                                            <div className="max-w-[72%]">
                                                <div className={`px-3.5 py-2 text-sm leading-relaxed shadow-sm`}
                                                    style={{
                                                        backgroundColor: isMe ? 'var(--color-primary)' : 'var(--color-surface-high)',
                                                        color: isMe ? 'var(--color-on-primary)' : 'var(--color-text)',
                                                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                    }}>
                                                    {msg.content}
                                                </div>
                                                <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'} px-1`}>
                                                    <span className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                                                        {formatTime(msg.created_at)}
                                                    </span>
                                                    {isMe && (
                                                        msg.read
                                                            ? <CheckCheck className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />
                                                            : <Check className="h-3 w-3" style={{ color: 'var(--color-text-subtle)' }} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>

                            {/* Input */}
                            <div className="px-4 py-3 shrink-0"
                                style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                                <div className="flex gap-2 items-center">
                                    <input
                                        value={text}
                                        onChange={e => setText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                                        placeholder="Type a message…"
                                        disabled={sending}
                                        className="flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none"
                                        style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                                    />
                                    <button onClick={send} disabled={!text.trim() || sending}
                                        className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-opacity"
                                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', opacity: (!text.trim() || sending) ? 0.5 : 1 }}>
                                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center flex-col gap-4">
                            <MessageCircle className="h-14 w-14 opacity-10" style={{ color: 'var(--color-text)' }} />
                            <div className="text-center">
                                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Your messages</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>
                                    Select a conversation or start a new one
                                </p>
                            </div>
                            <button onClick={() => setNewChatOpen(true)}
                                className="px-4 py-2 rounded-xl text-sm font-semibold"
                                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                                + New Chat
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* New Chat Dialog */}
            {newChatOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={e => e.target === e.currentTarget && setNewChatOpen(false)}>
                    <div className="rounded-2xl p-5 w-full max-w-sm shadow-xl"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>New Conversation</h2>
                            <button onClick={() => setNewChatOpen(false)} style={{ color: 'var(--color-text-subtle)' }}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <input
                            value={userSearch}
                            onChange={e => searchUsers(e.target.value)}
                            placeholder="Search by name or email…"
                            className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-3"
                            style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                            autoFocus
                        />
                        {userSearching && <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--color-text-subtle)' }} /></div>}
                        <div className="space-y-1 max-h-52 overflow-y-auto">
                            {userResults.map(u => (
                                <button key={u.id} onClick={() => startChat(u)}
                                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-colors"
                                    style={{ border: '1px solid var(--color-border)' }}
                                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)')}
                                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                                        {getInitial(u.full_name, u.email)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{u.full_name || u.email}</p>
                                        <p className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>{u.email} · {u.role}</p>
                                    </div>
                                </button>
                            ))}
                            {userSearch && !userSearching && userResults.length === 0 && (
                                <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-subtle)' }}>No users found</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
