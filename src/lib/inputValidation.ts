import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const walletAddressSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum wallet address');

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const tradeAmountSchema = z.string()
  .regex(/^\d+(\.\d+)?$/, 'Invalid amount format')
  .refine((val) => {
    const num = parseFloat(val);
    return num > 0 && num <= 1e18; // Reasonable limits
  }, 'Amount must be positive and within reasonable limits');

export const displayNameSchema = z.string()
  .min(1, 'Display name is required')
  .max(100, 'Display name must be 100 characters or less')
  .regex(/^[a-zA-Z0-9\s._-]+$/, 'Display name contains invalid characters');

export const descriptionSchema = z.string()
  .max(500, 'Description must be 500 characters or less')
  .optional();

export const messageContentSchema = z.string()
  .min(1, 'Message cannot be empty')
  .max(2000, 'Message must be 2000 characters or less');

// XSS Protection
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}

export function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .substring(0, 2000); // Limit length
}

// Rate limiting helpers
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const rateLimitConfigs = {
  auth: { windowMs: 60000, maxRequests: 5 }, // 5 auth attempts per minute
  api: { windowMs: 60000, maxRequests: 100 }, // 100 API calls per minute
  message: { windowMs: 60000, maxRequests: 30 }, // 30 messages per minute
  trade: { windowMs: 300000, maxRequests: 10 }, // 10 trades per 5 minutes
};

// CSRF Token validation
export function generateCSRFToken(): string {
  return crypto.randomUUID();
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken && token.length === 36;
}