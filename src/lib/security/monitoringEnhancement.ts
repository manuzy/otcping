import { auditLogger, AuditAction, ResourceType } from './auditLogger';
import { anomalyDetector } from './anomalyDetection';
import { logger } from '../logger';
import { supabase } from '@/integrations/supabase/client';

// Security alert levels
export enum AlertLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Security monitoring interface
interface SecurityAlert {
  id?: string;
  user_id: string;
  alert_type: string;
  severity: AlertLevel;
  description: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

class SecurityMonitor {
  private alertQueue: SecurityAlert[] = [];
  private isProcessing = false;

  // Monitor for suspicious RLS policy violations
  async monitorRLSViolations(userId: string, action: string, resourceType: string, context?: any): Promise<void> {
    try {
      // Check for unusual access patterns
      const anomalyScore = anomalyDetector.getUserRiskScore(userId);
      
      if (anomalyScore > 8) { // Risk score threshold of 8
        await this.createSecurityAlert({
          user_id: userId,
          alert_type: 'SUSPICIOUS_ACCESS_PATTERN',
          severity: AlertLevel.HIGH,
          description: `Suspicious access pattern detected for user ${userId}`,
          metadata: {
            action,
            resourceType,
            anomalyScore,
            context
          }
        });

        // Log to audit trail
        await auditLogger.logSuspicious(
          AuditAction.SUSPICIOUS_ACTIVITY,
          userId,
          { anomalyScore, action, resourceType }
        );
      }
    } catch (error) {
      logger.error('Error monitoring RLS violations:', error);
    }
  }

  // Monitor rate limiting breaches
  async monitorRateLimitBreaches(userId: string, action: string, breachCount: number): Promise<void> {
    try {
      const severity = breachCount > 10 ? AlertLevel.CRITICAL : 
                     breachCount > 5 ? AlertLevel.HIGH : AlertLevel.MEDIUM;

      await this.createSecurityAlert({
        user_id: userId,
        alert_type: 'RATE_LIMIT_BREACH',
        severity,
        description: `Rate limit breach detected: ${breachCount} violations for action ${action}`,
        metadata: {
          action,
          breachCount,
          timestamp: new Date().toISOString()
        }
      });

      // Log to audit trail
      await auditLogger.logSuspicious(
        AuditAction.RATE_LIMIT_EXCEEDED,
        userId,
        { action, breachCount }
      );

    } catch (error) {
      logger.error('Error monitoring rate limit breaches:', error);
    }
  }

  // Monitor failed authentication attempts
  async monitorAuthFailures(identifier: string, failureType: string, metadata?: any): Promise<void> {
    try {
      // Check for repeated failures from same identifier
      const recentFailures = await this.getRecentAuthFailures(identifier);
      
      if (recentFailures >= 5) {
        await this.createSecurityAlert({
          user_id: identifier,
          alert_type: 'REPEATED_AUTH_FAILURES',
          severity: AlertLevel.HIGH,
          description: `Multiple authentication failures detected from ${identifier}`,
          metadata: {
            failureType,
            failureCount: recentFailures,
            ...metadata
          }
        });
      }
    } catch (error) {
      logger.error('Error monitoring auth failures:', error);
    }
  }

  // Monitor data access anomalies
  async monitorDataAccess(userId: string, resourceType: string, resourceId: string, accessType: string): Promise<void> {
    try {
      // Track data access patterns
      await anomalyDetector.recordActivity(userId, 'data_access', resourceType, {
        resourceId,
        accessType,
        timestamp: Date.now()
      });

      // Check for unusual data access patterns
      const riskScore = anomalyDetector.getUserRiskScore(userId);
      
      if (riskScore > 7) { // Risk score threshold of 7
        await this.createSecurityAlert({
          user_id: userId,
          alert_type: 'UNUSUAL_DATA_ACCESS',
          severity: AlertLevel.MEDIUM,
          description: `Unusual data access pattern detected for user ${userId}`,
          metadata: {
            resourceType,
            resourceId,
            accessType,
            riskScore
          }
        });
      }
    } catch (error) {
      logger.error('Error monitoring data access:', error);
    }
  }

  // Create security alert
  private async createSecurityAlert(alert: SecurityAlert): Promise<void> {
    try {
      // Add to queue for batch processing
      this.alertQueue.push(alert);
      
      // Process queue if not already processing
      if (!this.isProcessing) {
        await this.processAlertQueue();
      }

      // Log critical alerts immediately
      if (alert.severity === AlertLevel.CRITICAL) {
        logger.error(`CRITICAL SECURITY ALERT: ${alert.description}`, {
          ...alert.metadata,
          alertType: alert.alert_type
        });
      }
    } catch (error) {
      logger.error('Error creating security alert:', error);
    }
  }

  // Process alert queue in batches
  private async processAlertQueue(): Promise<void> {
    if (this.isProcessing || this.alertQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    try {
      const alertsToProcess = this.alertQueue.splice(0, 10); // Process up to 10 alerts at once
      
      const { error } = await supabase
        .from('security_alerts')
        .insert(alertsToProcess);

      if (error) {
        logger.error('Error inserting security alerts:', error);
        // Re-add failed alerts to queue
        this.alertQueue.unshift(...alertsToProcess);
      }
    } catch (error) {
      logger.error('Error processing alert queue:', error);
    } finally {
      this.isProcessing = false;
      
      // Process remaining alerts if any
      if (this.alertQueue.length > 0) {
        setTimeout(() => this.processAlertQueue(), 1000);
      }
    }
  }

  // Get recent authentication failures for an identifier
  private async getRecentAuthFailures(identifier: string): Promise<number> {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('action', 'LOGIN_FAILED')
        .eq('user_id', identifier)
        .gte('created_at', fifteenMinutesAgo);

      if (error) {
        logger.error('Error fetching recent auth failures:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      logger.error('Error getting recent auth failures:', error);
      return 0;
    }
  }

  // Get security dashboard data
  async getSecurityDashboard(timeframe: string = '24h'): Promise<any> {
    try {
      const timeFrameMap = {
        '1h': 1,
        '24h': 24,
        '7d': 24 * 7,
        '30d': 24 * 30
      };

      const hours = timeFrameMap[timeframe as keyof typeof timeFrameMap] || 24;
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      // Get recent security alerts
      const { data: alerts, error: alertsError } = await supabase
        .from('security_alerts')
        .select('*')
        .gte('created_at', cutoffTime)
        .order('created_at', { ascending: false });

      // Get recent audit logs by severity
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('severity, action, created_at')
        .gte('created_at', cutoffTime);

      if (alertsError || auditError) {
        logger.error('Error fetching security dashboard data:', { alertsError, auditError });
        return null;
      }

      // Process statistics
      const alertStats = alerts?.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const auditStats = auditLogs?.reduce((acc, log) => {
        acc[log.severity] = (acc[log.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        timeframe,
        alerts: {
          total: alerts?.length || 0,
          byLevel: alertStats,
          recent: alerts?.slice(0, 10) || []
        },
        auditLogs: {
          total: auditLogs?.length || 0,
          bySeverity: auditStats
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error generating security dashboard:', error);
      return null;
    }
  }

  // Clean up old alerts
  async cleanupOldAlerts(retentionDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from('security_alerts')
        .delete()
        .lt('created_at', cutoffDate);

      if (error) {
        logger.error('Error cleaning up old security alerts:', error);
      } else {
        logger.info(`Security alerts cleanup completed for data older than ${retentionDays} days`);
      }
    } catch (error) {
      logger.error('Error during security alerts cleanup:', error);
    }
  }
}

export const securityMonitor = new SecurityMonitor();

// Helper functions for easy integration
export async function monitorRLSViolation(userId: string, action: string, resourceType: string, context?: any): Promise<void> {
  return securityMonitor.monitorRLSViolations(userId, action, resourceType, context);
}

export async function monitorRateLimitBreach(userId: string, action: string, breachCount: number): Promise<void> {
  return securityMonitor.monitorRateLimitBreaches(userId, action, breachCount);
}

export async function monitorAuthFailure(identifier: string, failureType: string, metadata?: any): Promise<void> {
  return securityMonitor.monitorAuthFailures(identifier, failureType, metadata);
}

export async function monitorDataAccess(userId: string, resourceType: string, resourceId: string, accessType: string): Promise<void> {
  return securityMonitor.monitorDataAccess(userId, resourceType, resourceId, accessType);
}