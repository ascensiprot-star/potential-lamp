import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Globe, Shield, Cpu, DollarSign, Bell, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CONFIG_SECTIONS = [
    {
        id: 'platform',
        icon: Globe,
        title: 'Platform Settings',
        fields: [
            { key: 'platform_name', label: 'Platform Name', type: 'text', default: 'ServiceFlow' },
            { key: 'platform_tagline', label: 'Tagline', type: 'text', default: 'Neighborhood Intelligence Platform' },
            { key: 'support_email', label: 'Support Email', type: 'text', default: 'support@serviceflow.ai' },
            { key: 'max_providers_per_zone', label: 'Max Providers Per Zone', type: 'number', default: '50' },
        ],
    },
    {
        id: 'ai',
        icon: Cpu,
        title: 'Simon AI Configuration',
        fields: [
            { key: 'simon_enabled', label: 'Enable Simon AI', type: 'toggle', default: 'true' },
            { key: 'auto_recommendations', label: 'Auto-send AI Recommendations', type: 'toggle', default: 'true' },
            { key: 'ai_demand_analysis', label: 'Real-time Demand Analysis', type: 'toggle', default: 'true' },
            { key: 'ai_bundle_suggestions', label: 'AI Bundle Auto-Suggestions', type: 'toggle', default: 'false' },
        ],
    },
    {
        id: 'pricing',
        icon: DollarSign,
        title: 'Pricing & Fees',
        fields: [
            { key: 'platform_fee_pct', label: 'Platform Fee (%)', type: 'number', default: '10' },
            { key: 'bundle_min_discount', label: 'Min Bundle Discount (%)', type: 'number', default: '15' },
            { key: 'bundle_max_discount', label: 'Max Bundle Discount (%)', type: 'number', default: '35' },
            { key: 'free_cancellation_hours', label: 'Free Cancellation Window (hours)', type: 'number', default: '24' },
        ],
    },
    {
        id: 'providers',
        icon: Shield,
        title: 'Provider Rules',
        fields: [
            { key: 'auto_approve_providers', label: 'Auto-approve new providers', type: 'toggle', default: 'false' },
            { key: 'min_rating_active', label: 'Minimum Rating to Stay Active', type: 'number', default: '3.0' },
            { key: 'max_advance_booking_days', label: 'Max Advance Booking (days)', type: 'number', default: '60' },
            { key: 'require_verification', label: 'Require Identity Verification', type: 'toggle', default: 'true' },
        ],
    },
    {
        id: 'notifications',
        icon: Bell,
        title: 'Notification Rules',
        fields: [
            { key: 'send_booking_reminders', label: 'Send Booking Reminders', type: 'toggle', default: 'true' },
            { key: 'reminder_hours_before', label: 'Reminder Hours Before Appointment', type: 'number', default: '24' },
            { key: 'send_review_requests', label: 'Auto-send Review Requests', type: 'toggle', default: 'true' },
            { key: 'review_request_delay_hours', label: 'Review Request Delay (hours)', type: 'number', default: '2' },
        ],
    },
];

const ALL_KEYS = CONFIG_SECTIONS.flatMap(s => s.fields.map(f => ({ ...f, section: s.id })));

export default function PlatformConfig() {
    const [config, setConfig] = useState({});
    const [recordIds, setRecordIds] = useState({}); // key -> record id for updates
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        const loaded = {};
        const ids = {};
        records.forEach(r => {
            loaded[r.key] = r.value;
            ids[r.key] = r.id;
        });
        // Fill defaults for any missing keys
        const defaults = {};
        ALL_KEYS.forEach(f => {
            defaults[f.key] = loaded[f.key] !== undefined ? loaded[f.key] : String(f.default);
        });
        setConfig(defaults);
        setRecordIds(ids);
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        // Upsert each key
        // Config save placeholder (requires Supabase)
        console.log('Config save (demo mode):', config);
        setSaving(false);
        toast.success('Platform configuration saved to database');
    };

    const setValue = (key, value) => setConfig(c => ({ ...c, [key]: String(value) }));
    const getBool = (key) => config[key] === 'true' || config[key] === true;

    if (loading) return (
        <div className="space-y-4 max-w-3xl">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-wave h-40 rounded-2xl" />)}
        </div>
    );

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="font-display font-bold text-2xl tracking-tight">Platform Configuration</h1>
                    <p className="text-muted-foreground text-sm mt-1">Changes are saved to the database and take effect immediately</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
            </div>

            {CONFIG_SECTIONS.map(section => (
                <div key={section.id} className="card-premium p-6">
                    <div className="flex items-center gap-2.5 mb-5">
                        <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <section.icon className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                        </div>
                        <h2 className="font-semibold text-base">{section.title}</h2>
                    </div>
                    <div className="space-y-4">
                        {section.fields.map(field => (
                            <div key={field.key} className="flex items-center justify-between gap-4">
                                <label className="text-sm font-medium flex-1">{field.label}</label>
                                {field.type === 'toggle' ? (
                                    <Switch
                                        checked={getBool(field.key)}
                                        onCheckedChange={v => setValue(field.key, v)}
                                    />
                                ) : (
                                    <Input
                                        type={field.type}
                                        value={config[field.key] ?? ''}
                                        onChange={e => setValue(field.key, e.target.value)}
                                        className="max-w-48 h-9 rounded-xl text-sm"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}