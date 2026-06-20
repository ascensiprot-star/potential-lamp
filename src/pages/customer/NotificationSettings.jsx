import { useState } from 'react';
import { Bell, Mail, Smartphone } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const NOTIFICATION_GROUPS = [
    {
        title: 'Bookings',
        items: [
            { key: 'booking_confirmed', label: 'Booking confirmed', desc: 'When a provider confirms your booking' },
            { key: 'booking_reminder', label: 'Booking reminder', desc: '24h and 1h before your appointment' },
            { key: 'booking_cancelled', label: 'Booking cancelled', desc: 'When a booking is cancelled by provider' },
            { key: 'booking_completed', label: 'Service completed', desc: 'Confirmation when service is done' },
        ],
    },
    {
        title: 'Messages',
        items: [
            { key: 'new_message', label: 'New messages', desc: 'When a provider sends you a message' },
            { key: 'message_read', label: 'Message read receipts', desc: 'When your message is read' },
        ],
    },
    {
        title: 'Promotions',
        items: [
            { key: 'bundle_deals', label: 'Bundle deals', desc: 'When new group deals form in your area' },
            { key: 'seasonal_tips', label: 'Seasonal tips', desc: 'Timely home maintenance suggestions' },
            { key: 'loyalty_updates', label: 'Loyalty rewards', desc: 'Points, tier updates, and credits' },
        ],
    },
    {
        title: 'Account',
        items: [
            { key: 'review_requests', label: 'Review requests', desc: 'After completing a service' },
            { key: 'account_security', label: 'Security alerts', desc: 'Login and account change alerts' },
        ],
    },
];

const CHANNELS = [
    { key: 'in_app', label: 'In-App', icon: Bell },
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'push', label: 'Push', icon: Smartphone },
];

export default function NotificationSettings() {
    const [settings, setSettings] = useState(() => {
        const defaults = {};
        NOTIFICATION_GROUPS.forEach(g => g.items.forEach(i => {
            CHANNELS.forEach(c => { defaults[`${i.key}_${c.key}`] = c.key !== 'push'; });
        }));
        return { ...defaults, ...JSON.parse(localStorage.getItem('notification_settings') || '{}') };
    });
    const [saving, setSaving] = useState(false);

    const toggle = (key) => setSettings(p => ({ ...p, [key]: !p[key] }));

    const save = () => {
        setSaving(true);
        localStorage.setItem('notification_settings', JSON.stringify(settings));
        setTimeout(() => { setSaving(false); toast.success('Notification preferences saved'); }, 400);
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="font-display font-bold text-3xl tracking-tight">Notification Settings</h1>
                <p className="text-zinc-500 text-sm mt-1">Choose when and how you get notified</p>
            </div>

            <div className="card-premium overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-wider gap-4">
                    <span>Notification</span>
                    {CHANNELS.map(c => <span key={c.key} className="text-center">{c.label}</span>)}
                </div>
                {NOTIFICATION_GROUPS.map(group => (
                    <div key={group.title}>
                        <div className="px-5 py-2.5 bg-zinc-50 border-y border-zinc-100">
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{group.title}</p>
                        </div>
                        {group.items.map(item => (
                            <div key={item.key} className="grid grid-cols-[1fr_auto_auto_auto] px-5 py-3.5 border-b border-zinc-50 last:border-0 items-center gap-4">
                                <div>
                                    <p className="text-sm font-medium text-zinc-800">{item.label}</p>
                                    <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
                                </div>
                                {CHANNELS.map(c => (
                                    <div key={c.key} className="flex justify-center">
                                        <Switch checked={!!settings[`${item.key}_${c.key}`]} onCheckedChange={() => toggle(`${item.key}_${c.key}`)} />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <Button className="w-full h-11 rounded-xl" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Preferences'}</Button>
        </div>
    );
}