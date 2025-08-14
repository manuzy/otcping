import { auditLogger, AuditAction, ResourceType } from './auditLogger';
import { logger } from '../logger';

export interface UserBehaviorPattern {
  userId: string;
  actionCounts: Map<string, number>;
  timeWindows: Map<string, number[]>;
  lastActivity: number;
  riskScore: number;
}

export interface AnomalyAlert {
  userId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: Record<string, any>;
  timestamp: number;
}

class AnomalyDetector {
  private patterns = new Map<string, UserBehaviorPattern>();
  private readonly cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
  private readonly suspiciousThresholds = {
    bulkDataAccess: { count: 100, window: 60 * 60 * 1000 }, // 100 accesses per hour
    rapidKYCAccess: { count: 20, window: 10 * 60 * 1000 }, // 20 KYC accesses per 10 minutes
    unusualTimeAccess: { startHour: 2, endHour: 6 }, // Access between 2-6 AM
    multipleFailedAuth: { count: 10, window: 30 * 60 * 1000 }, // 10 failed auths per 30 min
    suspiciousTradePattern: { count: 50, window: 60 * 60 * 1000 }, // 50 trades per hour
    crossUserDataAccess: { threshold: 0.8 } // Accessing 80%+ of different users' data
  };

  constructor() {
    // Clean up old patterns periodically
    setInterval(() => this.cleanupOldPatterns(), this.cleanupInterval);
  }

  private getOrCreatePattern(userId: string): UserBehaviorPattern {
    let pattern = this.patterns.get(userId);
    if (!pattern) {
      pattern = {
        userId,
        actionCounts: new Map(),
        timeWindows: new Map(),
        lastActivity: Date.now(),
        riskScore: 0
      };
      this.patterns.set(userId, pattern);
    }
    return pattern;
  }

  private cleanupOldPatterns(): void {
    const cutoff = Date.now() - this.cleanupInterval;
    for (const [userId, pattern] of this.patterns.entries()) {
      if (pattern.lastActivity < cutoff) {
        this.patterns.delete(userId);
      }
    }
  }

  async recordActivity(
    userId: string,
    action: string,
    resourceType: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const pattern = this.getOrCreatePattern(userId);
    const now = Date.now();

    // Update activity tracking
    pattern.lastActivity = now;
    pattern.actionCounts.set(action, (pattern.actionCounts.get(action) || 0) + 1);

    // Track time-based patterns
    const windowKey = `${action}:${resourceType}`;
    const timeWindow = pattern.timeWindows.get(windowKey) || [];
    timeWindow.push(now);
    
    // Keep only recent activities (last 24 hours)
    const cutoff = now - 24 * 60 * 60 * 1000;
    pattern.timeWindows.set(windowKey, timeWindow.filter(time => time > cutoff));

    // Check for anomalies
    await this.detectAnomalies(userId, action, resourceType, metadata);
  }

  private async detectAnomalies(
    userId: string,
    action: string,
    resourceType: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const pattern = this.patterns.get(userId);
    if (!pattern) return;

    const alerts: AnomalyAlert[] = [];

    // Check bulk data access
    if (await this.checkBulkDataAccess(pattern, action, resourceType)) {
      alerts.push({
        userId,
        alertType: 'bulk_data_access',
        severity: 'high',
        description: 'Unusual bulk data access pattern detected',
        metadata: { action, resourceType, ...metadata },
        timestamp: Date.now()
      });
    }

    // Check rapid KYC access
    if (await this.checkRapidKYCAccess(pattern, action, resourceType)) {
      alerts.push({
        userId,
        alertType: 'rapid_kyc_access',
        severity: 'critical',
        description: 'Rapid KYC data access detected',
        metadata: { action, resourceType, ...metadata },
        timestamp: Date.now()
      });
    }

    // Check unusual time access
    if (await this.checkUnusualTimeAccess()) {
      alerts.push({
        userId,
        alertType: 'unusual_time_access',
        severity: 'medium',
        description: 'Access during unusual hours',
        metadata: { action, resourceType, hour: new Date().getHours(), ...metadata },
        timestamp: Date.now()
      });
    }

    // Check failed authentication patterns
    if (await this.checkFailedAuthPattern(pattern, action)) {
      alerts.push({
        userId,
        alertType: 'multiple_failed_auth',
        severity: 'high',
        description: 'Multiple failed authentication attempts',
        metadata: { action, ...metadata },
        timestamp: Date.now()
      });
    }

    // Process any alerts found
    for (const alert of alerts) {
      await this.processAlert(alert);
    }
  }

  private async checkBulkDataAccess(
    pattern: UserBehaviorPattern,
    action: string,
    resourceType: string
  ): Promise<boolean> {
    const windowKey = `${action}:${resourceType}`;
    const timeWindow = pattern.timeWindows.get(windowKey) || [];
    const threshold = this.suspiciousThresholds.bulkDataAccess;
    
    const recentAccess = timeWindow.filter(
      time => Date.now() - time < threshold.window
    ).length;

    return recentAccess >= threshold.count;
  }

  private async checkRapidKYCAccess(
    pattern: UserBehaviorPattern,
    action: string,
    resourceType: string
  ): Promise<boolean> {
    if (resourceType !== ResourceType.KYC_VERIFICATION) return false;

    const windowKey = `${action}:${resourceType}`;
    const timeWindow = pattern.timeWindows.get(windowKey) || [];
    const threshold = this.suspiciousThresholds.rapidKYCAccess;
    
    const recentAccess = timeWindow.filter(
      time => Date.now() - time < threshold.window
    ).length;

    return recentAccess >= threshold.count;
  }

  private async checkUnusualTimeAccess(): Promise<boolean> {
    const currentHour = new Date().getHours();
    const threshold = this.suspiciousThresholds.unusualTimeAccess;
    
    return currentHour >= threshold.startHour && currentHour <= threshold.endHour;
  }

  private async checkFailedAuthPattern(
    pattern: UserBehaviorPattern,
    action: string
  ): Promise<boolean> {
    if (action !== AuditAction.LOGIN_FAILED) return false;

    const failedCount = pattern.actionCounts.get(AuditAction.LOGIN_FAILED) || 0;
    const threshold = this.suspiciousThresholds.multipleFailedAuth;
    
    const timeWindow = pattern.timeWindows.get(AuditAction.LOGIN_FAILED) || [];
    const recentFailed = timeWindow.filter(
      time => Date.now() - time < threshold.window
    ).length;

    return recentFailed >= threshold.count;
  }

  private async processAlert(alert: AnomalyAlert): Promise<void> {
    // Log the alert
    logger.security(`Anomaly detected: ${alert.alertType}`, {
      operation: 'anomaly_detection',
      metadata: alert
    });

    // Record in audit log
    await auditLogger.logSuspicious(
      AuditAction.SUSPICIOUS_ACTIVITY,
      alert.userId,
      {
        anomalyType: alert.alertType,
        severity: alert.severity,
        description: alert.description,
        ...alert.metadata
      }
    );

    // Update user risk score
    this.updateRiskScore(alert.userId, alert.severity);

    // In a production environment, you might also:
    // - Send notifications to security team
    // - Temporarily restrict user access
    // - Trigger additional verification steps
    // - Log to external security monitoring systems
  }

  private updateRiskScore(userId: string, severity: string): void {
    const pattern = this.patterns.get(userId);
    if (!pattern) return;

    const scoreIncrease = {
      low: 1,
      medium: 3,
      high: 5,
      critical: 10
    }[severity] || 1;

    pattern.riskScore += scoreIncrease;

    // Log risk score changes
    logger.warn(`User risk score updated`, {
      operation: 'risk_score_update',
      metadata: { userId, newScore: pattern.riskScore, severity }
    });
  }

  getUserRiskScore(userId: string): number {
    return this.patterns.get(userId)?.riskScore || 0;
  }

  async reset(userId: string): Promise<void> {
    this.patterns.delete(userId);
  }
}

export const anomalyDetector = new AnomalyDetector();

// Helper function to wrap sensitive operations with anomaly detection
export function withAnomalyDetection<T extends (...args: any[]) => Promise<any>>(
  operation: T,
  action: string,
  resourceType: string
): T {
  return (async (...args: any[]) => {
    const result = await operation(...args);
    
    // Extract user ID from result or context
    const userId = args[0]?.userId || args[0]?.user_id || 'unknown';
    
    if (userId !== 'unknown') {
      await anomalyDetector.recordActivity(userId, action, resourceType, {
        timestamp: Date.now(),
        success: !!result
      });
    }
    
    return result;
  }) as T;
}
