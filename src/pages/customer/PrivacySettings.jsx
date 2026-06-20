import { useState } from 'react';
import { Shield, Download, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const PRIVACY_ITEMS = [
    { key: 'show_profile',     label: 'Show profile to providers',        desc: 'Providers can see your name and profile photo when you book' },
    { key: 'share_location',   label: 'Share location for nearby',         desc: 'Allow the app to detect your location for nearby providers' },
    { key: 'analytics_tracking', label: 'Analytics tracking',              desc: 'Help improve the app with anonymous usage data' },
    { key: 'personalized_recs',  label: 'Personalized recommendations',    desc: 'Use your booking history to suggest relevant services' },
    { key: 'marketing_emails',   label: 'Marketing communications',        desc: 'Receive promotional offers and platform news' },
    { key: 'data_to_providers',  label: 'Share data with providers',       desc: 'Allow providers to see your booking patterns for better service' },
];

export default function PrivacySettings() {
    const [settings, setSettings] = useState(() => ({
        show_profile: true, share_location: true, analytics_tracking: false,
        personalized_recs: true, marketing_emails: false, data_to_providers: true,
        ...JSON.parse(localStorage.getItem('privacy_settings') || '{}'),
    }));

    const toggle = (key) => setSettings(p => ({ ...p, [key]: !p[key] }));

    const save = () => {
        localStorage.setItem('privacy_settings', JSON.stringify(settings));
        toast.success('Privacy settings saved');
    };

    return (
        <div className="space-y-5 max-w-2xl">
            <div>
                <h1 className="font-black text-xl tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>Privacy Settings</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Control how your data is used and shared</p>
            </div>

            {/* Privacy banner */}
            <div className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: 'var(--color-success-bg)', border: '1px solid rgba(110,231,183,0.15)' }}>
                <Shield className="h-4 w-4 shrink-0" style={{ color: 'var(--color-success)' }} />
                <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-success)' }}>Your privacy is our priority</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>We never sell your personal data to third parties.</p>
                </div>
            </div>

            {/* Toggle items */}
            <div className="space-y-1.5">
                {PRIVACY_ITEMS.map(item => (
                    <div key={item.key} className="flex items-center justify-between gap-4 rounded-xl p-4"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm" style={{ color: 'var(--color-primary)' }}>{item.label}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</p>
                        </div>
                        <Switch checked={!!settings[item.key]} onCheckedChange={() => toggle(item.key)} />
                    </div>
                ))}
            </div>

            {/* Save button */}
            <button className="w-full h-11 rounded-xl text-sm font-semibold transition-all"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={save}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                Save Privacy Settings
            </button>

            {/* Data management */}
            <div className="space-y-2">
                <h2 className="font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--color-text-subtle)' }}>Data Management</h2>
                {[
                    { icon: Download, label: 'Download My Data',   desc: 'Export all your personal data in JSON format',     action: 'Request Export', danger: false },
                    { icon: Trash2,   label: 'Delete My Account',  desc: 'Permanently delete your account and all data',    action: 'Delete Account', danger: true  },
                ].map(item => (
                    <div key={item.label} className="flex items-center justify-between gap-4 rounded-xl p-4"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <div className="flex items-center gap-3">
                            <item.icon className="h-4 w-4 shrink-0" style={{ color: item.danger ? 'var(--color-error)' : 'var(--color-text-muted)' }} />
                            <div>
                                <p className="font-medium text-sm" style={{ color: 'var(--color-primary)' }}>{item.label}</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</p>
                            </div>
                        </div>
                        <button className="h-8 px-3 rounded-lg text-xs font-semibold transition-all shrink-0"
                            style={{
                                backgroundColor: item.danger ? 'var(--color-error-bg)' : 'var(--color-surface-high)',
                                color: item.danger ? 'var(--color-error)' : 'var(--color-text)',
                                border: `1px solid ${item.danger ? 'rgba(252,165,165,0.2)' : 'var(--color-border-strong)'}`,
                                cursor: 'pointer', fontFamily: 'inherit',
                            }}
                            onClick={() => toast.info('Contact support to complete this request')}>
                            {item.action}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
