import { supabase } from '@/integrations/supabase/client';
import { logger } from '../logger';

export interface AuditLogEntry {
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export enum AuditAction {
  // Authentication actions
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  
  // KYC actions
  KYC_INITIATED = 'KYC_INITIATED',
  KYC_SUBMITTED = 'KYC_SUBMITTED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  KYC_DATA_ACCESSED = 'KYC_DATA_ACCESSED',
  
  // Admin actions
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  ADMIN_SETTINGS_CHANGED = 'ADMIN_SETTINGS_CHANGED',
  BULK_DATA_ACCESS = 'BULK_DATA_ACCESS',
  
  // Trade actions
  TRADE_CREATED = 'TRADE_CREATED',
  TRADE_UPDATED = 'TRADE_UPDATED',
  TRADE_DELETED = 'TRADE_DELETED',
  
  // Data access
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  
  // Security events
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS'
}

export enum ResourceType {
  USER = 'USER',
  TRADE = 'TRADE',
  KYC_VERIFICATION = 'KYC_VERIFICATION',
  NOTIFICATION_SETTING = 'NOTIFICATION_SETTING',
  ADMIN_SETTING = 'ADMIN_SETTING',
  PROFILE = 'PROFILE',
  SYSTEM = 'SYSTEM'
}

class AuditLogger {
  private async getClientInfo() {
    return {
      ip_address: await this.getClientIP(),
      user_agent: navigator.userAgent
    };
  }

  private async getClientIP(): Promise<string> {
    try {
      // In production, this should come from your backend
      // For now, we'll use a placeholder or remove IP tracking
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async log(entry: Omit<AuditLogEntry, 'ip_address' | 'user_agent'>): Promise<void> {
    try {
      const clientInfo = await this.getClientInfo();
      
      const fullEntry: AuditLogEntry = {
        ...entry,
        ...clientInfo,
        metadata: {
          timestamp: new Date().toISOString(),
          ...entry.metadata
        }
      };

      // Log to our internal logger first
      logger.security(entry.action, {
        operation: 'audit_log',
        metadata: fullEntry
      });

      // Store in database for audit trail
      await supabase.functions.invoke('audit-logger', {
        body: fullEntry
      });

    } catch (error) {
      // Never fail the operation due to audit logging issues
      logger.error('Failed to log audit entry', { metadata: entry }, error as Error);
    }
  }

  // Convenience methods for common audit scenarios
  async logAuth(action: AuditAction, userId: string, metadata?: Record<string, any>) {
    await this.log({
      user_id: userId,
      action,
      resource_type: ResourceType.USER,
      resource_id: userId,
      metadata,
      severity: action === AuditAction.LOGIN_FAILED ? 'medium' : 'low'
    });
  }

  async logKYC(action: AuditAction, userId: string, resourceId?: string, metadata?: Record<string, any>) {
    await this.log({
      user_id: userId,
      action,
      resource_type: ResourceType.KYC_VERIFICATION,
      resource_id: resourceId,
      metadata,
      severity: action.includes('ACCESS') ? 'high' : 'medium'
    });
  }

  async logAdmin(action: AuditAction, userId: string, resourceId?: string, metadata?: Record<string, any>) {
    await this.log({
      user_id: userId,
      action,
      resource_type: ResourceType.ADMIN_SETTING,
      resource_id: resourceId,
      metadata,
      severity: 'high'
    });
  }

  async logSuspicious(action: AuditAction, userId: string, metadata?: Record<string, any>) {
    await this.log({
      user_id: userId,
      action,
      resource_type: ResourceType.SYSTEM,
      metadata,
      severity: 'critical'
    });
  }

  async logDataAccess(resourceType: ResourceType, userId: string, resourceId?: string, metadata?: Record<string, any>) {
    await this.log({
      user_id: userId,
      action: AuditAction.SENSITIVE_DATA_ACCESS,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata,
      severity: 'medium'
    });
  }
}

export const auditLogger = new AuditLogger();