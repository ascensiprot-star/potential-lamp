import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cpu, Play, RotateCcw, Zap, Users, Package, CalendarDays, TrendingUp,
    AlertTriangle, CheckCircle, Loader2, Globe, Shield, Brain, Sparkles, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { simonRunAdminAction, simonStatus } from '@/lib/ai/simon';
import ReactMarkdown from 'react-markdown';

const AI_ACTIONS = [
    { id: 'auto_approve_providers', icon: Shield, title: 'Auto-Approve Verified Providers',
      desc: 'Simon scans all pending providers and auto-approves those who meet quality thresholds', category: 'providers', danger: false },
    { id: 'flag_low_rating', icon: AlertTriangle, title: 'Flag Low-Rating Providers',
      desc: 'Automatically flag providers with rating below 3.5 for review', category: 'providers', danger: true },
    { id: 'analyze_demand', icon: TrendingUp, title: 'Run Demand Analysis',
      desc: 'Simon analyzes all bookings and generates neighborhood demand reports', category: 'analytics', danger: false },
    { id: 'generate_bundles', icon: Package, title: 'AI Bundle Generator',
      desc: 'Simon identifies bundling opportunities and creates group deals automatically', category: 'bundles', danger: false },
    { id: 'send_reminders', icon: CalendarDays, title: 'Send Smart Reminders',
      desc: 'Simon sends personalized reminders to customers with upcoming or overdue services', category: 'notifications', danger: false },
    { id: 'cleanup_cancelled', icon: RotateCcw, title: 'Clean Up Cancelled Bookings',
      desc: 'Archive all cancelled bookings older than 30 days', category: 'maintenance', danger: true },
    { id: 'score_customers', icon: Users, title: 'Update Customer Loyalty Scores',
      desc: 'Recalculate loyalty tiers and risk scores for all customers', category: 'customers', danger: false },
    { id: 'health_check', icon: Globe, title: 'Platform Health Check',
      desc: 'Simon runs a comprehensive audit of the platform and reports anomalies', category: 'system', danger: false },
    { id: 'revenue_optimize', icon: Zap, title: 'Revenue Optimization Scan',
      desc: 'Simon identifies pricing gaps, underperforming categories, and revenue opportunities', category: 'analytics', danger: false },
    { id: 'churn_predict', icon: Activity, title: 'Customer Churn Prediction',
      desc: 'Simon identifies at-risk customers and suggests retention strategies', category: 'customers', danger: false },
];

const simonConfigured = simonStatus().configured;

export default function AIControl() {
    const [running, setRunning] = useState({});
    const [results, setResults] = useState({});
    const [stats, setStats] = useState({ providers: 0, bookings: 0, customers: 0 });
    const [expanded, setExpanded] = useState({});

    useEffect(() => {
        setStats({ providers: 0, bookings: 0, customers: 0 });
    }, []);

    const runAction = async (action) => {
        setRunning(r => ({ ...r, [action.id]: true }));
        setResults(r => ({ ...r, [action.id]: '' }));
        setExpanded(e => ({ ...e, [action.id]: true }));

        try {
            if (!simonConfigured) {
                setResults(r => ({
                    ...r,
                    [action.id]: `**Demo Mode — Simon AI not configured.**\n\nTo enable autonomous admin actions, add \`OPENROUTER_API_KEY\` to your environment variables.\n\n**Task**: ${action.title}\n\n${action.desc}`,
                }));
                toast.success(`${action.title} (demo)`);
            } else {
                await simonRunAdminAction(action, stats, (delta) => {
                    setResults(r => ({ ...r, [action.id]: (r[action.id] || '') + delta }));
                });
                toast.success(`${action.title} completed`);
            }
        } catch (e) {
            toast.error('Simon encountered an error');
            setResults(r => ({ ...r, [action.id]: 'Simon encountered an error. Please try again.' }));
        }
        setRunning(r => ({ ...r, [action.id]: false }));
    };

    const categories = [...new Set(AI_ACTIONS.map(a => a.category))];

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="font-bold text-2xl tracking-tight" style={{ color: 'var(--color-text)' }}>Simon AI Control Center</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-subtle)' }}>Autonomous platform management powered by Simon AI</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                    style={{ backgroundColor: simonConfigured ? 'var(--color-success-bg)' : 'var(--color-surface-high)', border: '1px solid var(--color-border)' }}>
                    <Cpu className="h-4 w-4" style={{ color: simonConfigured ? 'var(--color-success)' : 'var(--color-text-subtle)' }} />
                    <span style={{ color: simonConfigured ? 'var(--color-success)' : 'var(--color-text-subtle)' }}>
                        Simon {simonConfigured ? 'Active' : 'Not Configured'}
                    </span>
                    <div className="h-2 w-2 rounded-full" style={{
                        backgroundColor: simonConfigured ? 'var(--color-success)' : 'var(--color-text-subtle)',
                        animation: simonConfigured ? 'rt-pulse 2s ease-in-out infinite' : 'none',
                    }} />
                </div>
            </div>

            {/* Config notice */}
            {!simonConfigured && (
                <div className="rounded-2xl p-4 flex items-start gap-3"
                    style={{ backgroundColor: 'var(--color-warning-bg)', border: '1px solid rgba(245,158,11,0.3)' }}>
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
                    <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--color-warning)' }}>Simon AI Not Configured</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-warning)', opacity: 0.8 }}>
                            Add <code style={{ backgroundColor: 'rgba(245,158,11,0.15)', padding: '1px 5px', borderRadius: 4 }}>OPENROUTER_API_KEY</code> to your environment variables to activate autonomous AI actions. Actions will run in demo mode until configured.
                        </p>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Providers', value: stats.providers, icon: Shield },
                    { label: 'Bookings', value: stats.bookings, icon: CalendarDays },
                    { label: 'Customers', value: stats.customers, icon: Users },
                ].map(s => (
                    <div key={s.label} className="rounded-2xl p-4 flex items-center gap-3"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                            <s.icon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                        </div>
                        <div>
                            <div className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>{s.value}</div>
                            <div className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions by category */}
            {categories.map(cat => (
                <div key={cat}>
                    <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-subtle)' }}>{cat}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {AI_ACTIONS.filter(a => a.category === cat).map(action => (
                            <div key={action.id} className="rounded-2xl p-4"
                                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                                            style={{ backgroundColor: action.danger ? 'var(--color-error-bg)' : 'var(--color-surface-high)' }}>
                                            <action.icon className="h-4 w-4" style={{ color: action.danger ? 'var(--color-error)' : 'var(--color-accent)' }} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{action.title}</h3>
                                            {action.danger && (
                                                <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-error)' }}>High Impact</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => runAction(action)}
                                        disabled={running[action.id]}
                                        className="rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all"
                                        style={{
                                            backgroundColor: action.danger ? 'var(--color-error)' : 'var(--color-primary)',
                                            color: action.danger ? '#fff' : 'var(--color-on-primary)',
                                            opacity: running[action.id] ? 0.7 : 1,
                                        }}>
                                        {running[action.id]
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <Play className="h-3.5 w-3.5" />}
                                        {running[action.id] ? 'Running…' : 'Run'}
                                    </button>
                                </div>
                                <p className="text-xs mb-2" style={{ color: 'var(--color-text-subtle)' }}>{action.desc}</p>

                                {results[action.id] && (
                                    <div className="mt-3 rounded-xl p-3"
                                        style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)' }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <Brain className="h-3.5 w-3.5" style={{ color: 'var(--color-accent)' }} />
                                                <span className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>Simon's Report</span>
                                            </div>
                                            <button onClick={() => setExpanded(e => ({ ...e, [action.id]: !e[action.id] }))}
                                                className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                                                {expanded[action.id] ? 'Collapse' : 'Expand'}
                                            </button>
                                        </div>
                                        <div className={`prose prose-xs max-w-none text-xs leading-relaxed overflow-hidden transition-all ${expanded[action.id] ? '' : 'max-h-32'}`}
                                            style={{ color: 'var(--color-text)' }}>
                                            <ReactMarkdown>{results[action.id]}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
