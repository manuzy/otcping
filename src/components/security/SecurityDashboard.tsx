import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Shield, Activity, Clock } from 'lucide-react';
import { securityMonitor } from '@/lib/security/monitoringEnhancement';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface SecurityDashboardData {
  timeframe: string;
  alerts: {
    total: number;
    byLevel: Record<string, number>;
    recent: Array<{
      id: string;
      alert_type: string;
      severity: string;
      description: string;
      created_at: string;
      metadata?: any;
    }>;
  };
  auditLogs: {
    total: number;
    bySeverity: Record<string, number>;
  };
  lastUpdated: string;
}

const SEVERITY_COLORS = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
};

const SEVERITY_VARIANTS = {
  low: 'secondary' as const,
  medium: 'default' as const,
  high: 'default' as const,
  critical: 'destructive' as const
};

export function SecurityDashboard() {
  const { user } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();
  const [dashboardData, setDashboardData] = useState<SecurityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('24h');

  // Move useEffect after all hook declarations
  useEffect(() => {
    if (hasRole('moderator')) {
      loadDashboardData();
    }
  }, [timeframe, hasRole]);

  // Handle permission check after all hooks are declared
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasRole('moderator')) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to view the security dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await securityMonitor.getSecurityDashboard(timeframe);
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load security dashboard data');
      console.error('Security dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Activity className="h-4 w-4 text-yellow-500" />;
      default:
        return <Shield className="h-4 w-4 text-green-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" onClick={loadDashboardData} className="ml-4">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!dashboardData) {
    return (
      <Alert>
        <AlertDescription>No security data available.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Security Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor security alerts and audit logs for your application
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Last updated: {formatTimestamp(dashboardData.lastUpdated)}
          </span>
          <Button variant="outline" size="sm" onClick={loadDashboardData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Timeframe Selector */}
      <Tabs value={timeframe} onValueChange={setTimeframe}>
        <TabsList>
          <TabsTrigger value="1h">Last Hour</TabsTrigger>
          <TabsTrigger value="24h">Last 24 Hours</TabsTrigger>
          <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
        </TabsList>

        <TabsContent value={timeframe} className="space-y-6">
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.alerts.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {dashboardData.alerts.byLevel.critical || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {dashboardData.alerts.byLevel.high || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Audit Logs</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.auditLogs.total}</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Alerts</CardTitle>
              <CardDescription>
                Latest security alerts and incidents requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.alerts.recent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent security alerts. Your system is secure.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.alerts.recent.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start space-x-4 p-4 border rounded-lg"
                    >
                      <div className="flex-shrink-0">
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant={SEVERITY_VARIANTS[alert.severity as keyof typeof SEVERITY_VARIANTS]}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">{alert.alert_type}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>{formatTimestamp(alert.created_at)}</span>
                          {alert.metadata && (
                            <span>
                              User: {alert.metadata.userId || 'Unknown'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Log Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Log Summary</CardTitle>
              <CardDescription>
                Distribution of audit log events by severity level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(dashboardData.auditLogs.bySeverity).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS]}`} />
                      <span className="text-sm font-medium capitalize">{severity}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{count} events</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}