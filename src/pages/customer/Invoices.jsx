import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, HelpCircle, MessageCircle, FileText, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const FAQS = [
    { category: 'Booking', q: 'How do I book a service?', a: 'Browse services or providers, select your preferred slot, and confirm. You\'ll receive a confirmation notification instantly.' },
    { category: 'Booking', q: 'Can I reschedule a booking?', a: 'You can cancel a booking up to 24 hours before the appointment. Contact the provider through chat to discuss rescheduling options.' },
    { category: 'Booking', q: 'What happens if a provider cancels?', a: 'If a provider cancels, you\'ll receive a full refund and a notification to rebook with another provider.' },
    { category: 'Payments', q: 'What payment methods are accepted?', a: 'We accept all major credit cards, debit cards, and digital wallets. Payment is processed securely at the time of booking.' },
    { category: 'Payments', q: 'How do I get a refund?', a: 'Refunds are processed automatically for qualifying cancellations within 5–7 business days to your original payment method.' },
    { category: 'Providers', q: 'How are providers verified?', a: 'All providers undergo background checks, license verification, and platform reviews before being approved as trusted providers.' },
    { category: 'Providers', q: 'Can I request a specific provider?', a: 'Yes! After your first booking with a provider, you can mark them as a favorite and directly book with them for future services.' },
    { category: 'Account', q: 'How do I update my profile?', a: 'Go to Profile in the navigation. You can update your name, email preferences, notification settings, and saved addresses.' },
    { category: 'Bundles', q: 'What are group bundles?', a: 'Bundles let you coordinate with neighbors to book the same service together, unlocking group discounts of up to 35%.' },
];

export default function HelpCenter() {
    const [search, setSearch] = useState('');
    const [openFaq, setOpenFaq] = useState(null);
    const [activeCategory, setActiveCategory] = useState('All');

    const categories = ['All', ...new Set(FAQS.map(f => f.category))];
    const filtered = FAQS.filter(f => {
        const matchCat = activeCategory === 'All' || f.category === activeCategory;
        const matchSearch = !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    return (
        <div className="space-y-8 max-w-2xl">
            <div className="text-center pt-4">
                <HelpCircle className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                <h1 className="font-display font-bold text-3xl tracking-tight">Help Center</h1>
                <p className="text-zinc-500 text-sm mt-2">Find answers to common questions</p>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions…" className="pl-11 h-12 rounded-2xl" />
            </div>

            <div className="flex gap-2 flex-wrap">
                {categories.map(c => (
                    <button key={c} onClick={() => setActiveCategory(c)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${activeCategory === c ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                        {c}
                    </button>
                ))}
            </div>

            <div className="space-y-2">
                {filtered.map((f, i) => (
                    <div key={i} className="card-premium overflow-hidden">
                        <button className="w-full flex items-center justify-between px-5 py-4 text-left" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                            <span className="font-medium text-sm pr-4">{f.q}</span>
                            {openFaq === i ? <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />}
                        </button>
                        {openFaq === i && (
                            <div className="px-5 pb-4 text-sm text-zinc-500 leading-relaxed border-t border-zinc-50 pt-3">
                                {f.a}
                            </div>
                        )}
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="text-center py-12 text-zinc-400 text-sm">No results found for "{search}"</div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { icon: MessageCircle, title: 'Live Chat', desc: 'Chat with our support team', action: 'Start Chat', to: '/chat' },
                    { icon: FileText, title: 'Submit Ticket', desc: 'Report an issue in detail', action: 'Open Ticket', to: '/support' },
                    { icon: Phone, title: 'Call Support', desc: 'Available Mon–Fri 9am–6pm', action: '1-800-TRV-HELP', to: '#' },
                ].map(s => (
                    <div key={s.title} className="card-premium p-5 text-center">
                        <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                            <s.icon className="h-4.5 w-4.5 text-zinc-600" />
                        </div>
                        <p className="font-bold text-sm mb-1">{s.title}</p>
                        <p className="text-xs text-zinc-400 mb-3">{s.desc}</p>
                        <Button asChild variant="outline" size="sm" className="rounded-xl w-full"><Link to={s.to}>{s.action}</Link></Button>
                    </div>
                ))}
            </div>
        </div>
    );
}