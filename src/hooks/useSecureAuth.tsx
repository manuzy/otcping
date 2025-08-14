import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { auditLogger, AuditAction } from '@/lib/security/auditLogger';
import { enforceRateLimit, recordRateLimitedRequest } from '@/lib/security/rateLimiter';
import { csrfProtection } from '@/lib/security/csrfProtection';
import { anomalyDetector } from '@/lib/security/anomalyDetection';
import { logger } from '@/lib/logger';

export function useSecureAuth() {
  const auth = useAuth();

  // Secure sign in with rate limiting and audit logging
  const secureSignIn = useCallback(async (email: string, password: string) => {
    try {
      // Check rate limit first
      const rateLimitResult = await enforceRateLimit('global', 'auth', {
        keyGenerator: () => `auth:${email}:${new Date().getHours()}` // Rate limit by email and hour
      });

      if (!rateLimitResult.allowed) {
        await auditLogger.logAuth(AuditAction.LOGIN_FAILED, 'unknown', {
          email,
          reason: 'rate_limited',
          retryAfter: rateLimitResult.retryAfter
        });
        
        throw new Error(`Too many login attempts. Please try again in ${Math.ceil((rateLimitResult.retryAfter || 0) / 1000)} seconds.`);
      }

      // Attempt sign in
      const result = await auth.signInWithPassword(email, password);
      
      if (result.error) {
        // Record failed attempt
        await recordRateLimitedRequest('global', 'auth', false);
        await auditLogger.logAuth(AuditAction.LOGIN_FAILED, 'unknown', {
          email,
          error: result.error.message
        });
        
        // Record in anomaly detection
        await anomalyDetector.recordActivity('unknown', AuditAction.LOGIN_FAILED, 'USER', {
          email,
          timestamp: Date.now()
        });
        
        throw new Error(result.error.message);
      }

      // Success - record successful attempt
      await recordRateLimitedRequest('global', 'auth', true);
      
      if (result.data?.user) {
        await auditLogger.logAuth(AuditAction.LOGIN, result.data.user.id, {
          email,
          provider: 'email'
        });

        // Record successful login in anomaly detection
        await anomalyDetector.recordActivity(result.data.user.id, AuditAction.LOGIN, 'USER', {
          email,
          timestamp: Date.now()
        });

        // Refresh CSRF token on successful login
        csrfProtection.refreshToken();
      }

      return result;
    } catch (error) {
      logger.error('Secure sign in failed', { operation: 'secure_sign_in', metadata: { email } }, error as Error);
      throw error;
    }
  }, [auth]);

  // Secure sign out with audit logging
  const secureSignOut = useCallback(async () => {
    try {
      const user = auth.user;
      const result = await auth.signOut();
      
      if (user) {
        await auditLogger.logAuth(AuditAction.LOGOUT, user.id);
      }

      // Clear CSRF token on logout
      csrfProtection.clearToken();

      return result;
    } catch (error) {
      logger.error('Secure sign out failed', { operation: 'secure_sign_out' }, error as Error);
      throw error;
    }
  }, [auth]);

  // Monitor for session changes and log them
  useEffect(() => {
    if (auth.user) {
      // Log session start/restoration
      auditLogger.logAuth(AuditAction.LOGIN, auth.user.id, {
        sessionType: 'restored',
        timestamp: Date.now()
      });
    }
  }, [auth.user]);

  // Monitor for suspicious activity patterns
  useEffect(() => {
    if (!auth.user) return;

    const checkSuspiciousActivity = async () => {
      const riskScore = anomalyDetector.getUserRiskScore(auth.user!.id);
      
      if (riskScore > 20) { // High risk threshold
        await auditLogger.logSuspicious(AuditAction.SUSPICIOUS_ACTIVITY, auth.user!.id, {
          riskScore,
          reason: 'high_risk_threshold_exceeded'
        });
        
        logger.warn('High risk user activity detected', {
          operation: 'risk_monitoring',
          metadata: { userId: auth.user!.id, riskScore }
        });
      }
    };

    // Check risk score periodically
    const interval = setInterval(checkSuspiciousActivity, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(interval);
  }, [auth.user]);

  return {
    ...auth,
    signInWithPassword: secureSignIn,
    signOut: secureSignOut,
    csrfToken: csrfProtection.getToken(),
    refreshCSRFToken: csrfProtection.refreshToken.bind(csrfProtection)
  };
}