import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Activity, Shield, AlertTriangle, CheckCircle, XCircle, RotateCcw, Eye, Loader2, TrendingUp, Database, Zap, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function SimonOversight() {
    const [snapshot, setSnapshot] = useState(null);
    const [anomalies, setAnomalies] = useState([]);
    const [actions, setActions] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedAction, setSelectedAction] = useState(null);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [snapshotRes, anomaliesRes, actionsRes, statsRes] = await Promise.all([
                fetch('/api/admin/simon/snapshot'),
                fetch('/api/admin/simon/anomalies'),
                fetch('/api/admin/simon/actions'),
                fetch('/api/admin/simon/stats')
            ]);

            const [snapshotData, anomaliesData, actionsData, statsData] = await Promise.all([
                snapshotRes.json(),
                anomaliesRes.json(),
                actionsRes.json(),
                statsRes.json()
            ]);

            setSnapshot(snapshotData);
            setAnomalies(anomaliesData.anomalies || []);
            setActions(actionsData.actions || []);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load Simon data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (actionId, execute = false) => {
        try {
            const response = await fetch(`/api/admin/simon/actions/${actionId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ execute })
            });
            const data = await response.json();
            if (data.success) {
                toast.success(`Action approved${execute ? ' and executed' : ''}`);
                loadData();
            }
        } catch (error) {
            toast.error('Failed to approve action');
        }
    };

    const handleReject = async (actionId) => {
        try {
            const response = await fetch(`/api/admin/simon/actions/${actionId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Admin rejected' })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Action rejected');
                loadData();
            }
        } catch (error) {
            toast.error('Failed to reject action');
        }
    };

    const handleReverse = async (actionId) => {
        try {
            const response = await fetch(`/api/admin/simon/actions/${actionId}/reverse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Admin reversed' })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Action reversed');
                loadData();
            }
        } catch (error) {
            toast.error('Failed to reverse action');
        }
    };

    const getActionIcon = (actionType) => {
        switch (actionType) {
            case 'wallet_freeze': return Shield;
            case 'wallet_unfreeze': return Shield;
            case 'dispute_escalate': return AlertTriangle;
            case 'booking_reroute': return Activity;
            case 'warning_send': return AlertTriangle;
            case 'anomaly_flag': return AlertTriangle;
            case 'recommendation': return Brain;
            default: return Activity;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending_approval': return <Badge variant="warning">Pending Approval</Badge>;
            case 'approved': return <Badge variant="success">Approved</Badge>;
            case 'rejected': return <Badge variant="error">Rejected</Badge>;
            case 'executed': return <Badge variant="success">Executed</Badge>;
            case 'reversed': return <Badge variant="error">Reversed</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="font-bold text-2xl tracking-tight" style={{ color: 'var(--color-text)' }}>Simon Oversight</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-subtle)' }}>Monitor and control Simon's autonomous actions</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={loadData} size="sm" variant="outline">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* System Snapshot */}
            {snapshot && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{snapshot.users?.total || 0}</div>
                            <div className="text-xs text-muted-foreground">{snapshot.users?.active || 0} active now</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{snapshot.bookings?.active || 0}</div>
                            <div className="text-xs text-muted-foreground">{snapshot.bookings?.today || 0} today</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Financial Health</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">PKR {(snapshot.financial?.total_balance || 0).toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">{snapshot.financial?.frozen_wallets || 0} frozen wallets</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Pending Disputes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{snapshot.disputes?.pending || 0}</div>
                            <div className="text-xs text-muted-foreground">{snapshot.disputes?.total || 0} total</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Anomalies */}
            {anomalies.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            Active Anomalies
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {anomalies.map((anomaly, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${anomaly.severity === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={anomaly.severity === 'high' ? 'error' : 'warning'}>
                                                {anomaly.severity}
                                            </Badge>
                                            <span className="text-sm font-medium">{anomaly.type}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{anomaly.description}</p>
                                        <div className="text-xs text-muted-foreground mt-1">Confidence: {(anomaly.confidence * 100).toFixed(0)}%</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Model Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Brain className="h-4 w-4" />
                                Model Calls
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.model_usage?.totalCalls || 0}</div>
                            <div className="text-xs text-muted-foreground">{stats.model_usage?.successRate || '0%'} success</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                Simon Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.actions?.total_actions || 0}</div>
                            <div className="text-xs text-muted-foreground">{stats.actions?.pending || 0} pending</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Zap className="h-4 w-4" />
                                Avg Confidence
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.actions?.avg_confidence ? (stats.actions.avg_confidence * 100).toFixed(0) + '%' : 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{stats.actions?.executed || 0} executed</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Cache Hit Rate
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.model_usage?.cacheHitRate || '0%'}</div>
                            <div className="text-xs text-muted-foreground">{stats.model_usage?.uptime || '0m'} uptime</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Recent Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Simon Actions
                    </CardTitle>
                    <CardDescription>Review and manage autonomous actions proposed by Simon</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {actions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No recent actions from Simon
                            </div>
                        ) : (
                            actions.map((action) => {
                                const ActionIcon = getActionIcon(action.action_type);
                                return (
                                    <div key={action.id} className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-surface)' }}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                                                    <ActionIcon className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium capitalize">{action.action_type.replace(/_/g, ' ')}</span>
                                                        {getStatusBadge(action.status)}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{action.reasoning}</p>
                                                    {action.action_data && (
                                                        <div className="mt-2 p-2 rounded bg-slate-100 dark:bg-slate-800">
                                                            <pre className="text-xs overflow-auto">{JSON.stringify(action.action_data, null, 2)}</pre>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {new Date(action.created_at).toLocaleString()}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Brain className="h-3 w-3" />
                                                            Confidence: {(action.confidence_score * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {action.status === 'pending_approval' && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleApprove(action.id, false)}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleApprove(action.id, true)}
                                                        className="bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        <Zap className="h-4 w-4 mr-1" />
                                                        Approve & Execute
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleReject(action.id)}
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            )}
                                            {action.status === 'executed' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleReverse(action.id)}
                                                >
                                                    <RotateCcw className="h-4 w-4 mr-1" />
                                                    Reverse
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
