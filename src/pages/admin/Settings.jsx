import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Bell, CalendarDays, Globe, Plus, Pencil, Trash2, Check,
    DollarSign, Shield, Users, Star, MapPin, RefreshCw, AlertTriangle, CheckCircle, Cpu, Sliders
} from 'lucide-react';

const TABS = [
    ['general', 'General', Globe],
    ['booking', 'Booking', CalendarDays],
    ['payments', 'Payments', DollarSign],
    ['notifications', 'Notifications', Bell],
    ['security', 'Security', Shield],
    ['ai', 'AI & Automation', Cpu],
    ['providers', 'Providers', Users],
    ['customers', 'Customers', Star],
    ['localization', 'Localization', MapPin],
    ['advanced', 'Advanced', Sliders],
];

const TRIGGER_LABELS = {
    after_booking_created: 'After booking created',
    before_appointment_24h: '24h before appointment',
    before_appointment_1h: '1h before appointment',
    same_day_morning: 'Same day (morning)',
    after_completion: 'After completion',
    on_no_show: 'On no-show',
    on_cancellation: 'On cancellation',
    payment_due: 'Payment due',
};

const EMPTY_RULE = {
    name: '', trigger: 'before_appointment_24h', channels: ['in_app'],
    title_template: '', body_template: '', recipient: 'customer', is_active: true, offset_hours: -24,
};

const SettingRow = ({ label, desc, children }) => (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-zinc-50 last:border-0">
        <div className="flex-1">
            <p className="text-sm font-medium text-zinc-800">{label}</p>
            {desc && <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>}
        </div>
        <div className="shrink-0">{children}</div>
    </div>
);

export default function Settings() {
    const [tab, setTab] = useState('general');
    const [saving, setSaving] = useState(false);
     
    const [settingIds, setSettingIds] = useState({});
    const [reminderRules, setReminderRules] = useState([]);
    const [ruleDialog, setRuleDialog] = useState(false);
    const [ruleForm, setRuleForm] = useState(EMPTY_RULE);
    const [editRuleId, setEditRuleId] = useState(null);
    const [loading, setLoading] = useState(true);

    // All settings state
    const [s, setS] = useState({
        // General
        platform_name: 'Truvornex',
        platform_tagline: 'The operating system for your neighborhood.',
        support_email: 'support@truvornex.com',
        contact_phone: '',
        logo_url: '',
        favicon_url: '',
        maintenance_mode: false,
        maintenance_message: 'Platform is under maintenance. Back soon.',

        // Booking
        currency: 'USD',
        default_advance_booking_days: '30',
        default_slot_interval: '30',
        default_buffer_time: '0',
        default_cancellation_hours: '24',
        max_bookings_per_slot: '1',
        require_booking_approval: false,
        auto_confirm_bookings: false,
        allow_same_day_booking: true,
        booking_lead_time_hours: '1',
        max_advance_booking_months: '3',

        // Payments
        platform_fee_percent: '15',
        min_service_price: '5',
        max_service_price: '10000',
        allow_tips: true,
        tip_percentages: '10,15,20',
        refund_window_hours: '24',
        auto_issue_invoices: true,
        invoice_prefix: 'TRV',
        tax_rate_percent: '0',
        payment_methods: 'card',

        // Notifications
        chat_enabled: true,
        email_notifications: true,
        push_notifications: false,
        sms_notifications: false,
        notification_from_name: 'Truvornex',
        booking_confirmation_email: true,
        booking_reminder_enabled: true,
        review_request_enabled: true,
        admin_alert_email: '',
        digest_frequency: 'daily',

        // Security
        require_email_verification: true,
        max_login_attempts: '5',
        session_timeout_hours: '72',
        two_factor_enabled: false,
        password_min_length: '8',
        require_provider_id_check: true,
        require_background_check: false,
        audit_log_retention_days: '90',
        ip_blocking_enabled: false,
        rate_limit_requests: '100',

        // AI
        ai_recommendations_enabled: true,
        ai_demand_prediction: true,
        ai_anomaly_detection: true,
        ai_bundle_suggestions: true,
        ai_provider_ranking: true,
        ai_customer_insights: true,
        ai_auto_moderation: false,
        ai_chatbot_enabled: false,
        ai_price_suggestions: false,
        simon_ai_active: true,
        ai_confidence_threshold: '70',
        ai_model: 'standard',

        // Providers
        provider_auto_approve: false,
        require_business_license: false,
        require_insurance: false,
        min_provider_rating: '0',
        provider_suspension_threshold: '2',
        provider_max_categories: '5',
        provider_trial_period_days: '30',
        provider_payout_frequency: 'weekly',
        provider_support_tier: 'standard',
        show_provider_earnings: true,

        // Customers
        loyalty_program_enabled: true,
        referral_program_enabled: true,
        gift_cards_enabled: true,
        bundles_enabled: true,
        customer_review_required: false,
        max_cancellations_per_month: '3',
        vip_threshold: '2000',
        champion_threshold: '5000',
        new_customer_discount: '0',
        customer_data_retention_days: '365',

        // Localization
        default_language: 'en',
        date_format: 'MM/DD/YYYY',
        time_format: '12h',
        distance_unit: 'km',
        timezone: 'UTC',

        // Advanced
        debug_mode: false,
        api_rate_limit: '1000',
        cache_ttl_seconds: '300',
        max_file_upload_mb: '10',
        allowed_file_types: 'jpg,jpeg,png,pdf',
        cors_origins: '',
        webhook_secret: '',
        feature_flags: '',
    });

    const set = (key, value) => setS(prev => ({ ...prev, [key]: value }));

    const loadSettings = async () => {
        const byKey = {};
        const ids = {};
        // recs would come from Supabase
        setS(prev => {
            const merged = { ...prev };
            Object.entries(byKey).forEach(([k, v]) => {
                if (k in merged) {
                    if (v === 'true') merged[k] = true;
                    else if (v === 'false') merged[k] = false;
                    else merged[k] = v;
                }
            });
            return merged;
        });
        setSettingIds(ids);
        setLoading(false);
    };

    useEffect(() => { loadSettings(); }, []);

    const saveTab = async () => {
        setSaving(true);
        const upserts = Object.entries(s).map(async ([key, value]) => {
            const val = String(value);
            // Save placeholder (requires Supabase)
            console.log('Save setting (demo mode):', key, val);
        });
        await Promise.all(upserts);
        setSaving(false);
        toast.success('Settings saved successfully');
    };

    const saveRule = async () => {
        toast.success(editRuleId ? 'Rule updated' : 'Rule created');
        setRuleDialog(false);
    };

    const deleteRule = async (id) => {
        setReminderRules(prev => prev.filter(r => r.id !== id));
        toast.success('Rule deleted');
    };

    const toggleRuleActive = async (rule) => {
        setReminderRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
    };

    const toggleChannel = (ch) => {
        setRuleForm(prev => ({
            ...prev,
            channels: prev.channels?.includes(ch) ? prev.channels.filter(c => c !== ch) : [...(prev.channels || []), ch],
        }));
    };

    if (loading) return <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton-wave h-12 rounded-2xl" />)}</div>;

    return (
        <div className="max-w-4xl">
            <div className="mb-6">
                <h1 className="font-inter font-black text-2xl tracking-tight">Platform Settings</h1>
                <p className="text-zinc-400 text-sm mt-0.5">Full configuration for every aspect of the platform</p>
            </div>

            {/* Tab bar */}
            <div className="flex flex-wrap gap-1 mb-6 p-1.5 rounded-2xl" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                {TABS.map(([key, label, Icon]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold transition-all"
                        style={{
                            backgroundColor: tab === key ? 'var(--color-primary)' : 'transparent',
                            color: tab === key ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                            boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        <Icon className="h-3.5 w-3.5" />{label}
                    </button>
                ))}
            </div>

            {/* ── GENERAL ── */}
            {tab === 'general' && (
                <div className="space-y-4">
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Branding</h3>
                        <p className="text-xs text-zinc-400 mb-4">Platform identity and appearance</p>
                        <SettingRow label="Platform Name" desc="Displayed in the header and emails">
                            <Input value={s.platform_name} onChange={e => set('platform_name', e.target.value)} className="rounded-xl w-48" />
                        </SettingRow>
                        <SettingRow label="Tagline" desc="Hero section subtitle">
                            <Input value={s.platform_tagline} onChange={e => set('platform_tagline', e.target.value)} className="rounded-xl w-64" />
                        </SettingRow>
                        <SettingRow label="Logo URL" desc="Full URL to your logo image">
                            <Input value={s.logo_url} onChange={e => set('logo_url', e.target.value)} className="rounded-xl w-64" placeholder="https://…" />
                        </SettingRow>
                    </div>
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Contact Information</h3>
                        <p className="text-xs text-zinc-400 mb-4">Support and admin contact details</p>
                        <SettingRow label="Support Email" desc="Public-facing support email address">
                            <Input value={s.support_email} onChange={e => set('support_email', e.target.value)} className="rounded-xl w-56" type="email" />
                        </SettingRow>
                        <SettingRow label="Contact Phone" desc="Displayed in footer">
                            <Input value={s.contact_phone} onChange={e => set('contact_phone', e.target.value)} className="rounded-xl w-48" />
                        </SettingRow>
                        <SettingRow label="Admin Alert Email" desc="Where to send critical system alerts">
                            <Input value={s.admin_alert_email} onChange={e => set('admin_alert_email', e.target.value)} className="rounded-xl w-56" type="email" placeholder="admin@…" />
                        </SettingRow>
                    </div>
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Platform Status</h3>
                        <p className="text-xs text-zinc-400 mb-4">Control platform availability</p>
                        <SettingRow label="Maintenance Mode" desc="Redirect all users to a maintenance page">
                            <Switch checked={!!s.maintenance_mode} onCheckedChange={v => set('maintenance_mode', v)} />
                        </SettingRow>
                        <SettingRow label="Maintenance Message" desc="Shown during maintenance">
                            <Input value={s.maintenance_message} onChange={e => set('maintenance_message', e.target.value)} className="rounded-xl w-72" />
                        </SettingRow>
                    </div>
                </div>
            )}

            {/* ── BOOKING ── */}
            {tab === 'booking' && (
                <div className="space-y-4">
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Scheduling Defaults</h3>
                        <p className="text-xs text-zinc-400 mb-4">Default values for all providers (can be overridden per-provider)</p>
                        <SettingRow label="Advance Booking Window" desc="How many days ahead customers can book">
                            <Input type="number" value={s.default_advance_booking_days} onChange={e => set('default_advance_booking_days', e.target.value)} className="rounded-xl w-24" />
                        </SettingRow>
                        <SettingRow label="Slot Interval (minutes)" desc="Gap between available booking slots">
                            <Select value={s.default_slot_interval} onValueChange={v => set('default_slot_interval', v)}>
                                <SelectTrigger className="rounded-xl w-32"><SelectValue /></SelectTrigger>
                                <SelectContent>{['15', '30', '45', '60', '90', '120'].map(v => <SelectItem key={v} value={v}>{v} min</SelectItem>)}</SelectContent>
                            </Select>
                        </SettingRow>
                        <SettingRow label="Buffer Time (minutes)" desc="Break between bookings">
                            <Select value={s.default_buffer_time} onValueChange={v => set('default_buffer_time', v)}>
                                <SelectTrigger className="rounded-xl w-32"><SelectValue /></SelectTrigger>
                                <SelectContent>{['0', '10', '15', '30', '45', '60'].map(v => <SelectItem key={v} value={v}>{v === '0' ? 'None' : `${v} min`}</SelectItem>)}</SelectContent>
                            </Select>
                        </SettingRow>
                        <SettingRow label="Cancellation Window (hours)" desc="Min hours before appointment to allow cancellation">
                            <Select value={s.default_cancellation_hours} onValueChange={v => set('default_cancellation_hours', v)}>
                                <SelectTrigger className="rounded-xl w-32"><SelectValue /></SelectTrigger>
                                <SelectContent>{['1', '2', '4', '6', '12', '24', '48', '72'].map(v => <SelectItem key={v} value={v}>{v}h</SelectItem>)}</SelectContent>
                            </Select>
                        </SettingRow>
                        <SettingRow label="Booking Lead Time (hours)" desc="Min notice required to book">
                            <Input type="number" value={s.booking_lead_time_hours} onChange={e => set('booking_lead_time_hours', e.target.value)} className="rounded-xl w-24" />
                        </SettingRow>
                        <SettingRow label="Max Advance Booking (months)" desc="Furthest future date customers can book">
                            <Input type="number" value={s.max_advance_booking_months} onChange={e => set('max_advance_booking_months', e.target.value)} className="rounded-xl w-24" />
                        </SettingRow>
                    </div>
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Booking Rules</h3>
                        <p className="text-xs text-zinc-400 mb-4">Platform-wide booking behavior</p>
                        <SettingRow label="Require Manual Approval" desc="Providers must approve each booking">
                            <Switch checked={!!s.require_booking_approval} onCheckedChange={v => set('require_booking_approval', v)} />
                        </SettingRow>
                        <SettingRow label="Auto-Confirm Bookings" desc="Automatically confirm all new bookings">
                            <Switch checked={!!s.auto_confirm_bookings} onCheckedChange={v => set('auto_confirm_bookings', v)} />
                        </SettingRow>
                        <SettingRow label="Allow Same-Day Booking" desc="Let customers book for today">
                            <Switch checked={!!s.allow_same_day_booking} onCheckedChange={v => set('allow_same_day_booking', v)} />
                        </SettingRow>
                    </div>
                </div>
            )}

            {/* ── PAYMENTS ── */}
            {tab === 'payments' && (
                <div className="space-y-4">
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Platform Fees</h3>
                        <p className="text-xs text-zinc-400 mb-4">Revenue share configuration</p>
                        <SettingRow label="Platform Fee (%)" desc="Commission taken from each transaction">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold w-12 text-right">{s.platform_fee_percent}%</span>
                                <Slider value={[Number(s.platform_fee_percent)]} onValueChange={v => set('platform_fee_percent', String(v[0]))} min={0} max={40} step={1} className="w-32" />
                            </div>
                        </SettingRow>
                        <SettingRow label="Tax Rate (%)" desc="Applied to all transactions">
                            <Input type="number" value={s.tax_rate_percent} onChange={e => set('tax_rate_percent', e.target.value)} className="rounded-xl w-24" step="0.5" />
                        </SettingRow>
                        <SettingRow label="Currency" desc="Default display currency">
                            <Select value={s.currency} onValueChange={v => set('currency', v)}>
                                <SelectTrigger className="rounded-xl w-32"><SelectValue /></SelectTrigger>
                                <SelectContent>{['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'AED', 'JPY'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </SettingRow>
                    </div>
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Pricing Limits</h3>
                        <p className="text-xs text-zinc-400 mb-4">Min/max allowed service prices</p>
                        <SettingRow label="Minimum Service Price" desc={`In ${s.currency}`}>
                            <Input type="number" value={s.min_service_price} onChange={e => set('min_service_price', e.target.value)} className="rounded-xl w-28" />
                        </SettingRow>
                        <SettingRow label="Maximum Service Price" desc={`In ${s.currency}`}>
                            <Input type="number" value={s.max_service_price} onChange={e => set('max_service_price', e.target.value)} className="rounded-xl w-28" />
                        </SettingRow>
                    </div>
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Billing Behavior</h3>
                        <p className="text-xs text-zinc-400 mb-4">Invoice and refund settings</p>
                        <SettingRow label="Auto-Issue Invoices" desc="Automatically generate invoices on booking completion">
                            <Switch checked={!!s.auto_issue_invoices} onCheckedChange={v => set('auto_issue_invoices', v)} />
                        </SettingRow>
                        <SettingRow label="Invoice Number Prefix" desc="Prefix for all invoice numbers">
                            <Input value={s.invoice_prefix} onChange={e => set('invoice_prefix', e.target.value.toUpperCase())} className="rounded-xl w-28 font-mono" maxLength={5} />
                        </SettingRow>
                        <SettingRow label="Refund Window (hours)" desc="After how many hours refunds are no longer automatic">
                            <Input type="number" value={s.refund_window_hours} onChange={e => set('refund_window_hours', e.target.value)} className="rounded-xl w-24" />
                        </SettingRow>
                        <SettingRow label="Allow Tips" desc="Let customers tip providers after service">
                            <Switch checked={!!s.allow_tips} onCheckedChange={v => set('allow_tips', v)} />
                        </SettingRow>
                        <SettingRow label="Tip Options (%)" desc="Comma-separated tip percentages to offer">
                            <Input value={s.tip_percentages} onChange={e => set('tip_percentages', e.target.value)} className="rounded-xl w-32 font-mono" placeholder="10,15,20" />
                        </SettingRow>
                        <SettingRow label="Payout Frequency (Providers)" desc="How often provider payouts are processed">
                            <Select value={s.provider_payout_frequency} onValueChange={v => set('provider_payout_frequency', v)}>
                                <SelectTrigger className="rounded-xl w-32"><SelectValue /></SelectTrigger>
                                <SelectContent>{['daily', 'weekly', 'biweekly', 'monthly'].map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}</SelectContent>
                            </Select>
                        </SettingRow>
                    </div>
                </div>
            )}

            {/* ── NOTIFICATIONS ── */}
            {tab === 'notifications' && (
                <div className="space-y-4">
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Channels</h3>
                        <p className="text-xs text-zinc-400 mb-4">Enable/disable notification delivery channels</p>
                        <SettingRow label="In-App Notifications" desc="Real-time alerts within the platform">
                            <Switch checked={true} disabled />
                        </SettingRow>
                        <SettingRow label="Email Notifications" desc="Send notifications via email">
                            <Switch checked={!!s.email_notifications} onCheckedChange={v => set('email_notifications', v)} />
                        </SettingRow>
                        <SettingRow label="Push Notifications" desc="Browser and mobile push alerts">
                            <Switch checked={!!s.push_notifications} onCheckedChange={v => set('push_notifications', v)} />
                        </SettingRow>
                        <SettingRow label="SMS Notifications" desc="Text message alerts (requires SMS provider)">
                            <Switch checked={!!s.sms_notifications} onCheckedChange={v => set('sms_notifications', v)} />
                        </SettingRow>
                        <SettingRow label="Notification Sender Name" desc="From name in emails">
                            <Input value={s.notification_from_name} onChange={e => set('notification_from_name', e.target.value)} className="rounded-xl w-40" />
                        </SettingRow>
                    </div>
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Event Triggers</h3>
                        <p className="text-xs text-zinc-400 mb-4">Which events trigger notifications</p>
                        <SettingRow label="Booking Confirmation" desc="Send confirmation when booking is made">
                            <Switch checked={!!s.booking_confirmation_email} onCheckedChange={v => set('booking_confirmation_email', v)} />
                        </SettingRow>
                        <SettingRow label="Booking Reminders" desc="Send reminders before appointments">
                            <Switch checked={!!s.booking_reminder_enabled} onCheckedChange={v => set('booking_reminder_enabled', v)} />
                        </SettingRow>
                        <SettingRow label="Review Requests" desc="Request reviews after service completion">
                            <Switch checked={!!s.review_request_enabled} onCheckedChange={v => set('review_request_enabled', v)} />
                        </SettingRow>
                        <SettingRow label="In-App Chat" desc="Enable messaging between customers and providers">
                            <Switch checked={!!s.chat_enabled} onCheckedChange={v => set('chat_enabled', v)} />
                        </SettingRow>
                        <SettingRow label="Admin Digest Frequency" desc="How often to send admin summary emails">
                            <Select value={s.digest_frequency} onValueChange={v => set('digest_frequency', v)}>
                                <SelectTrigger className="rounded-xl w-32"><SelectValue /></SelectTrigger>
                                <SelectContent>{['realtime', 'hourly', 'daily', 'weekly'].map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}</SelectContent>
                            </Select>
                        </SettingRow>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-sm">Automated Reminder Rules</p>
                                <p className="text-xs text-zinc-400">Custom notification triggers and templates</p>
                            </div>
                            <Button size="sm" className="rounded-xl gap-1.5" onClick={() => { setRuleForm(EMPTY_RULE); setEditRuleId(null); setRuleDialog(true); }}>
                                <Plus className="h-4 w-4" /> Add Rule
                            </Button>
                        </div>
                        {reminderRules.length === 0 ? (
                            <div className="card-premium p-8 text-center">
                                <Bell className="h-8 w-8 text-zinc-200 mx-auto mb-3" />
                                <p className="text-sm text-zinc-400">No reminder rules yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {reminderRules.map(rule => (
                                    <div key={rule.id} className="card-premium p-4 flex items-center gap-3">
                                        <Switch checked={rule.is_active} onCheckedChange={() => toggleRuleActive(rule)} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{rule.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[11px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{TRIGGER_LABELS[rule.trigger] || rule.trigger}</span>
                                                <span className="text-[11px] text-zinc-400 capitalize">{rule.recipient}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => { setRuleForm(rule); setEditRuleId(rule.id); setRuleDialog(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-red-400" onClick={() => deleteRule(rule.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── SECURITY ── */}
            {tab === 'security' && (
                <div className="space-y-4">
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Authentication</h3>
                        <p className="text-xs text-zinc-400 mb-4">Login and session security settings</p>
                        <SettingRow label="Require Email Verification" desc="Users must verify email before accessing platform">
                            <Switch checked={!!s.require_email_verification} onCheckedChange={v => set('require_email_verification', v)} />
                        </SettingRow>
                        <SettingRow label="Two-Factor Authentication" desc="Require 2FA for admin accounts">
                            <Switch checked={!!s.two_factor_enabled} onCheckedChange={v => set('two_factor_enabled', v)} />
                        </SettingRow>
                        <SettingRow label="Max Login Attempts" desc="Lock account after N failed attempts">
                            <Input type="number" value={s.max_login_attempts} onChange={e => set('max_login_attempts', e.target.value)} className="rounded-xl w-24" min={3} max={20} />
                        </SettingRow>
                        <SettingRow label="Session Timeout (hours)" desc="Auto-logout after inactivity">
                            <Input type="number" value={s.session_timeout_hours} onChange={e => set('session_timeout_hours', e.target.value)} className="rounded-xl w-24" />
                        </SettingRow>
                        <SettingRow label="Minimum Password Length" desc="Enforce strong passwords">
                            <Input type="number" value={s.password_min_length} onChange={e => set('password_min_length', e.target.value)} className="rounded-xl w-24" min={6} max={32} />
                        </SettingRow>
                    </div>
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Provider Verification</h3>
                        <p className="text-xs text-zinc-400 mb-4">Identity and credential requirements for providers</p>
                        <SettingRow label="Require ID Verification" desc="Providers must submit government ID">
                            <Switch checked={!!s.require_provider_id_check} onCheckedChange={v => set('require_provider_id_check', v)} />
                        </SettingRow>
                        <SettingRow label="Require Background Check" desc="Third-party background screening">
                            <Switch checked={!!s.require_background_check} onCheckedChange={v => set('require_background_check', v)} />
                        </SettingRow>
                        <SettingRow label="Require Business License" desc="Verify business registration">
                            <Switch checked={!!s.require_business_license} onCheckedChange={v => set('require_business_license', v)} />
                        </SettingRow>
                        <SettingRow label="Require Insurance" desc="Proof of liability insurance">
                            <Switch checked={!!s.require_insurance} onCheckedChange={v => set('require_insurance', v)} />
                        </SettingRow>
                    </div>
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Platform Protection</h3>
                        <p className="text-xs text-zinc-400 mb-4">Abuse prevention and access control</p>
                        <SettingRow label="IP Blocking" desc="Enable automatic IP blocking for suspicious activity">
                            <Switch checked={!!s.ip_blocking_enabled} onCheckedChange={v => set('ip_blocking_enabled', v)} />
                        </SettingRow>
                        <SettingRow label="Rate Limit (req/min)" desc="Max API requests per minute per user">
                            <Input type="number" value={s.rate_limit_requests} onChange={e => set('rate_limit_requests', e.target.value)} className="rounded-xl w-28" />
                        </SettingRow>
                        <SettingRow label="Audit Log Retention (days)" desc="How long to keep audit trail records">
                            <Select value={s.audit_log_retention_days} onValueChange={v => set('audit_log_retention_days', v)}>
                                <SelectTrigger className="rounded-xl w-32"><SelectValue /></SelectTrigger>
                                <SelectContent>{['30', '60', '90', '180', '365'].map(d => <SelectItem key={d} value={d}>{d} days</SelectItem>)}</SelectContent>
                            </Select>
                        </SettingRow>
                    </div>
                </div>
            )}

            {/* ── AI ── */}
            {tab === 'ai' && (
                <div className="space-y-4">
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Simon AI Features</h3>
                        <p className="text-xs text-zinc-400 mb-4">Intelligent platform capabilities powered by Simon AI</p>
                        <SettingRow label="Simon AI Active" desc="Master toggle for all AI features">
                            <Switch checked={!!s.simon_ai_active} onCheckedChange={v => set('simon_ai_active', v)} />
                        </SettingRow>
                        <SettingRow label="AI Recommendations" desc="Personalized service suggestions for customers">
                            <Switch checked={!!s.ai_recommendations_enabled} onCheckedChange={v => set('ai_recommendations_enabled', v)} />
                        </SettingRow>
                        <SettingRow label="Demand Prediction" desc="Forecast service demand by category and area">
                            <Switch checked={!!s.ai_demand_prediction} onCheckedChange={v => set('ai_demand_prediction', v)} />
                        </SettingRow>
                        <SettingRow label="Anomaly Detection" desc="Automatic detection of suspicious booking patterns">
                            <Switch checked={!!s.ai_anomaly_detection} onCheckedChange={v => set('ai_anomaly_detection', v)} />
                        </SettingRow>
                        <SettingRow label="Bundle Opportunity Suggestions" desc="AI identifies neighbors who should book together">
                            <Switch checked={!!s.ai_bundle_suggestions} onCheckedChange={v => set('ai_bundle_suggestions', v)} />
                        </SettingRow>
                        <SettingRow label="AI Provider Ranking" desc="Rank providers by AI trust score">
                            <Switch checked={!!s.ai_provider_ranking} onCheckedChange={v => set('ai_provider_ranking', v)} />
                        </SettingRow>
                        <SettingRow label="Customer Insights" desc="AI-generated insights for each customer segment">
                            <Switch checked={!!s.ai_customer_insights} onCheckedChange={v => set('ai_customer_insights', v)} />
                        </SettingRow>
                        <SettingRow label="AI Price Suggestions" desc="Suggest competitive pricing to providers">
                            <Switch checked={!!s.ai_price_suggestions} onCheckedChange={v => set('ai_price_suggestions', v)} />
                        </SettingRow>
                        <SettingRow label="Auto-Moderation" desc="AI auto-removes harmful reviews or content">
                            <Switch checked={!!s.ai_auto_moderation} onCheckedChange={v => set('ai_auto_moderation', v)} />
                        </SettingRow>
                        <SettingRow label="AI Chatbot (Customer Facing)" desc="Enable AI assistant on customer pages">
                            <Switch checked={!!s.ai_chatbot_enabled} onCheckedChange={v => set('ai_chatbot_enabled', v)} />
                        </SettingRow>
                    </div>
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">AI Thresholds</h3>
                        <p className="text-xs text-zinc-400 mb-4">Configure AI decision sensitivity</p>
                        <SettingRow label="Confidence Threshold (%)" desc="Min confidence for AI to act automatically">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold w-12 text-right">{s.ai_confidence_threshold}%</span>
                                <Slider value={[Number(s.ai_confidence_threshold)]} onValueChange={v => set('ai_confidence_threshold', String(v[0]))} min={50} max={95} step={5} className="w-32" />
                            </div>
                        </SettingRow>
                        <SettingRow label="AI Model Tier" desc="Quality vs speed tradeoff">
                            <Select value={s.ai_model} onValueChange={v => set('ai_model', v)}>
                                <SelectTrigger className="rounded-xl w-36"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fast">Fast (lightweight)</SelectItem>
                                    <SelectItem value="standard">Standard</SelectItem>
                                    <SelectItem value="premium">Premium (best quality)</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingRow>
                    </div>
                </div>
            )}

            {/* ── PROVIDERS ── */}
            {tab === 'providers' && (
                <div className="space-y-4">
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Onboarding</h3>
                        <p className="text-xs text-zinc-400 mb-4">How new providers join the platform</p>
                        <SettingRow label="Auto-Approve Providers" desc="Skip manual review for new providers">
                            <Switch checked={!!s.provider_auto_approve} onCheckedChange={v => set('provider_auto_approve', v)} />
                        </SettingRow>
                        <SettingRow label="Trial Period (days)" desc="Free period before subscription required">
                            <Input type="number" value={s.provider_trial_period_days} onChange={e => set('provider_trial_period_days', e.target.value)} className="rounded-xl w-24" />
                        </SettingRow>
                        <SettingRow label="Max Service Categories" desc="Max categories a provider can list under">
                            <Input type="number" value={s.provider_max_categories} onChange={e => set('provider_max_categories', e.target.value)} className="rounded-xl w-24" min={1} max={20} />
                        </SettingRow>
                    </div>
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Quality Standards</h3>
                        <p className="text-xs text-zinc-400 mb-4">Maintain platform service quality</p>
                        <SettingRow label="Minimum Rating" desc="Auto-suspend providers below this rating">
                            <Select value={s.min_provider_rating} onValueChange={v => set('min_provider_rating', v)}>
                                <SelectTrigger className="rounded-xl w-32"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="0">No minimum</SelectItem>{['2.5', '3.0', '3.5', '4.0', '4.5'].map(r => <SelectItem key={r} value={r}>⭐ {r}+</SelectItem>)}</SelectContent>
                            </Select>
                        </SettingRow>
                        <SettingRow label="Suspension Threshold" desc="Suspend after N consecutive no-shows">
                            <Input type="number" value={s.provider_suspension_threshold} onChange={e => set('provider_suspension_threshold', e.target.value)} className="rounded-xl w-24" min={1} max={10} />
                        </SettingRow>
                        <SettingRow label="Show Provider Earnings" desc="Let providers see their full earnings breakdown">
                            <Switch checked={!!s.show_provider_earnings} onCheckedChange={v => set('show_provider_earnings', v)} />
                        </SettingRow>
                    </div>
                </div>
            )}

            {/* ── CUSTOMERS ── */}
            {tab === 'customers' && (
                <div className="space-y-4">
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Loyalty & Rewards</h3>
                        <p className="text-xs text-zinc-400 mb-4">Customer retention programs</p>
                        <SettingRow label="Loyalty Program" desc="Tier-based rewards for repeat customers">
                            <Switch checked={!!s.loyalty_program_enabled} onCheckedChange={v => set('loyalty_program_enabled', v)} />
                        </SettingRow>
                        <SettingRow label="Referral Program" desc="Reward customers for inviting friends">
                            <Switch checked={!!s.referral_program_enabled} onCheckedChange={v => set('referral_program_enabled', v)} />
                        </SettingRow>
                        <SettingRow label="Gift Cards" desc="Enable purchasing and redeeming gift cards">
                            <Switch checked={!!s.gift_cards_enabled} onCheckedChange={v => set('gift_cards_enabled', v)} />
                        </SettingRow>
                        <SettingRow label="Group Bundles" desc="Let customers form group deals">
                            <Switch checked={!!s.bundles_enabled} onCheckedChange={v => set('bundles_enabled', v)} />
                        </SettingRow>
                        <SettingRow label="VIP Threshold ($)" desc="Lifetime spend to reach VIP tier">
                            <Input type="number" value={s.vip_threshold} onChange={e => set('vip_threshold', e.target.value)} className="rounded-xl w-28" />
                        </SettingRow>
                        <SettingRow label="Champion Threshold ($)" desc="Lifetime spend to reach Champion tier">
                            <Input type="number" value={s.champion_threshold} onChange={e => set('champion_threshold', e.target.value)} className="rounded-xl w-28" />
                        </SettingRow>
                    </div>
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Behavior Controls</h3>
                        <p className="text-xs text-zinc-400 mb-4">Customer account restrictions</p>
                        <SettingRow label="Max Cancellations/Month" desc="Auto-flag accounts that cancel too often">
                            <Input type="number" value={s.max_cancellations_per_month} onChange={e => set('max_cancellations_per_month', e.target.value)} className="rounded-xl w-24" />
                        </SettingRow>
                        <SettingRow label="New Customer Discount (%)" desc="One-time discount for first booking">
                            <Input type="number" value={s.new_customer_discount} onChange={e => set('new_customer_discount', e.target.value)} className="rounded-xl w-24" min={0} max={50} />
                        </SettingRow>
                        <SettingRow label="Require Review After Service" desc="Prompt users to leave a review before rebooking">
                            <Switch checked={!!s.customer_review_required} onCheckedChange={v => set('customer_review_required', v)} />
                        </SettingRow>
                        <SettingRow label="Data Retention (days)" desc="How long to keep customer data after account deletion">
                            <Input type="number" value={s.customer_data_retention_days} onChange={e => set('customer_data_retention_days', e.target.value)} className="rounded-xl w-24" />
                        </SettingRow>
                    </div>
                </div>
            )}

            {/* ── LOCALIZATION ── */}
            {tab === 'localization' && (
                <div className="card-premium p-5">
                    <h3 className="font-bold text-sm mb-1 text-zinc-700">Regional Settings</h3>
                    <p className="text-xs text-zinc-400 mb-4">Date, time, and regional format preferences</p>
                    <SettingRow label="Default Language" desc="Platform UI language">
                        <Select value={s.default_language} onValueChange={v => set('default_language', v)}>
                            <SelectTrigger className="rounded-xl w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="es">Español</SelectItem>
                                <SelectItem value="fr">Français</SelectItem>
                                <SelectItem value="de">Deutsch</SelectItem>
                                <SelectItem value="ar">العربية</SelectItem>
                                <SelectItem value="zh">中文</SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingRow>
                    <SettingRow label="Date Format" desc="How dates are displayed">
                        <Select value={s.date_format} onValueChange={v => set('date_format', v)}>
                            <SelectTrigger className="rounded-xl w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingRow>
                    <SettingRow label="Time Format" desc="12-hour or 24-hour clock">
                        <Select value={s.time_format} onValueChange={v => set('time_format', v)}>
                            <SelectTrigger className="rounded-xl w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                                <SelectItem value="24h">24-hour</SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingRow>
                    <SettingRow label="Distance Unit" desc="Miles or kilometers">
                        <Select value={s.distance_unit} onValueChange={v => set('distance_unit', v)}>
                            <SelectTrigger className="rounded-xl w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="km">Kilometers</SelectItem>
                                <SelectItem value="miles">Miles</SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingRow>
                    <SettingRow label="Default Timezone" desc="Server-side timestamp reference">
                        <Select value={s.timezone} onValueChange={v => set('timezone', v)}>
                            <SelectTrigger className="rounded-xl w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </SettingRow>
                </div>
            )}

            {/* ── ADVANCED ── */}
            {tab === 'advanced' && (
                <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">Advanced settings can affect platform stability. Only modify if you know what you're doing.</p>
                    </div>
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Performance</h3>
                        <p className="text-xs text-zinc-400 mb-4">Caching and rate limiting</p>
                        <SettingRow label="API Rate Limit (req/min)" desc="Global requests per minute per session">
                            <Input type="number" value={s.api_rate_limit} onChange={e => set('api_rate_limit', e.target.value)} className="rounded-xl w-28" />
                        </SettingRow>
                        <SettingRow label="Cache TTL (seconds)" desc="How long to cache data responses">
                            <Input type="number" value={s.cache_ttl_seconds} onChange={e => set('cache_ttl_seconds', e.target.value)} className="rounded-xl w-28" />
                        </SettingRow>
                    </div>
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">File Uploads</h3>
                        <p className="text-xs text-zinc-400 mb-4">Upload limits and allowed file types</p>
                        <SettingRow label="Max Upload Size (MB)" desc="Maximum file size for user uploads">
                            <Input type="number" value={s.max_file_upload_mb} onChange={e => set('max_file_upload_mb', e.target.value)} className="rounded-xl w-28" />
                        </SettingRow>
                        <SettingRow label="Allowed File Types" desc="Comma-separated extensions">
                            <Input value={s.allowed_file_types} onChange={e => set('allowed_file_types', e.target.value)} className="rounded-xl w-56 font-mono text-xs" />
                        </SettingRow>
                    </div>
                    <div className="card-premium p-5">
                        <h3 className="font-bold text-sm mb-1 text-zinc-700">Developer</h3>
                        <p className="text-xs text-zinc-400 mb-4">Integration and debug settings</p>
                        <SettingRow label="Debug Mode" desc="Enable verbose error logging">
                            <Switch checked={!!s.debug_mode} onCheckedChange={v => set('debug_mode', v)} />
                        </SettingRow>
                        <SettingRow label="Webhook Secret" desc="Shared secret for outgoing webhook signatures">
                            <Input type="password" value={s.webhook_secret} onChange={e => set('webhook_secret', e.target.value)} className="rounded-xl w-48 font-mono" placeholder="sk_live_…" />
                        </SettingRow>
                        <SettingRow label="CORS Origins" desc="Comma-separated allowed origins">
                            <Input value={s.cors_origins} onChange={e => set('cors_origins', e.target.value)} className="rounded-xl w-64 font-mono text-xs" placeholder="https://app.example.com" />
                        </SettingRow>
                    </div>
                </div>
            )}

            <div className="pt-4">
                <Button className="w-full h-12 rounded-2xl text-base font-bold gap-2" onClick={saveTab} disabled={saving}>
                    {saving ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</> : <><CheckCircle className="h-4 w-4" /> Save {TABS.find(t => t[0] === tab)?.[1]} Settings</>}
                </Button>
            </div>

            {/* Reminder Rule Dialog */}
            <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>{editRuleId ? 'Edit' : 'Create'} Reminder Rule</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-1">
                        <Input placeholder="Rule name *" value={ruleForm.name} onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })} className="rounded-xl" />
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">Trigger</label>
                            <Select value={ruleForm.trigger} onValueChange={v => setRuleForm({ ...ruleForm, trigger: v })}>
                                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>{Object.entries(TRIGGER_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">Send To</label>
                                <Select value={ruleForm.recipient} onValueChange={v => setRuleForm({ ...ruleForm, recipient: v })}>
                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="customer">Customer</SelectItem><SelectItem value="provider">Provider</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">Offset (hours)</label>
                                <Input type="number" value={ruleForm.offset_hours} onChange={e => setRuleForm({ ...ruleForm, offset_hours: Number(e.target.value) })} className="rounded-xl" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">Channels</label>
                            <div className="flex gap-2">
                                {[['in_app', 'In-App'], ['email', 'Email'], ['sms', 'SMS']].map(([ch, label]) => {
                                    const active = ruleForm.channels?.includes(ch);
                                    return (
                                        <button key={ch} onClick={() => toggleChannel(ch)}
                                            className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold transition-all"
                                            style={{
                                                backgroundColor: active ? 'var(--color-primary)' : 'transparent',
                                                color: active ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                                                border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                                cursor: 'pointer', fontFamily: 'inherit',
                                            }}>
                                            {active && <Check className="h-3 w-3" />}{label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <Input placeholder="Title Template *" value={ruleForm.title_template} onChange={e => setRuleForm({ ...ruleForm, title_template: e.target.value })} className="rounded-xl" />
                        <Textarea placeholder="Body: Use {{service_name}}, {{provider_name}}, {{date}}, {{time_slot}}" value={ruleForm.body_template} onChange={e => setRuleForm({ ...ruleForm, body_template: e.target.value })} className="rounded-xl resize-none" rows={3} />
                        <div className="flex items-center gap-2.5">
                            <Switch checked={ruleForm.is_active !== false} onCheckedChange={v => setRuleForm({ ...ruleForm, is_active: v })} />
                            <span className="text-sm font-medium">Active</span>
                        </div>
                        <Button className="w-full rounded-xl h-11" onClick={saveRule} disabled={!ruleForm.name || !ruleForm.title_template}>
                            {editRuleId ? 'Update Rule' : 'Create Rule'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}