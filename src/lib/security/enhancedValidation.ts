import { z } from 'zod';
import { sanitizeHtml, sanitizeText } from '../inputValidation';

// Enhanced SQL injection detection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
  /(\b(or|and)\s+[\w\s]*\s*=\s*[\w\s]*)/i,
  /([\'\"][\s]*;[\s]*--)/i,
  /([\'\"][\s]*;[\s]*\/\*)/i,
  /(\bwhere\s+[\w\s]*\s*=\s*[\w\s]*\s*(or|and))/i,
  /(script[\s]*:)/i,
  /(javascript[\s]*:)/i,
  /(<[\s]*script)/i,
  /(eval[\s]*\()/i,
  /(expression[\s]*\()/i
];

// Enhanced XSS detection patterns
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /<form[^>]*>.*?<\/form>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
  /<img[^>]*src\s*=\s*["']?javascript:/gi
];

// Enhanced input validation functions
export function detectSQLInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  const normalizedInput = input.toLowerCase().trim();
  
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(normalizedInput));
}

export function detectXSS(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

export function sanitizeAndValidateInput(input: string, maxLength: number = 2000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // First check for malicious patterns
  if (detectSQLInjection(input) || detectXSS(input)) {
    throw new Error('Input contains potentially malicious content');
  }

  // Sanitize HTML and trim
  let sanitized = sanitizeHtml(input);
  sanitized = sanitizeText(sanitized);
  
  // Enforce length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

// Enhanced validation schemas
export const enhancedMessageSchema = z.string()
  .min(1, 'Message cannot be empty')
  .max(2000, 'Message must be 2000 characters or less')
  .refine((val) => !detectSQLInjection(val), 'Message contains invalid characters')
  .refine((val) => !detectXSS(val), 'Message contains potentially unsafe content')
  .transform((val) => sanitizeAndValidateInput(val));

export const enhancedEmailSchema = z.string()
  .email('Invalid email address')
  .max(254, 'Email address is too long')
  .refine((val) => !detectXSS(val), 'Email contains invalid characters')
  .transform((val) => sanitizeText(val));

export const enhancedDisplayNameSchema = z.string()
  .min(1, 'Display name is required')
  .max(100, 'Display name must be 100 characters or less')
  .refine((val) => !detectSQLInjection(val), 'Display name contains invalid characters')
  .refine((val) => !detectXSS(val), 'Display name contains potentially unsafe content')
  .transform((val) => sanitizeAndValidateInput(val, 100));

export const enhancedTradeAmountSchema = z.string()
  .regex(/^\d+(\.\d{1,18})?$/, 'Invalid amount format')
  .refine((val) => {
    const num = parseFloat(val);
    return num > 0 && num <= 1e18 && !isNaN(num);
  }, 'Amount must be a positive number within valid limits')
  .refine((val) => !detectSQLInjection(val), 'Amount contains invalid characters');

// Content filtering for specific use cases
export function filterProfanity(text: string): string {
  // Basic profanity filter - in production, use a more comprehensive solution
  const profanityPatterns = [
    /\b(spam|scam|fraud|phishing)\b/gi,
    /\b(hack|hacking|exploit)\b/gi,
    // Add more patterns as needed
  ];

  let filtered = text;
  profanityPatterns.forEach(pattern => {
    filtered = filtered.replace(pattern, '[FILTERED]');
  });

  return filtered;
}

// File upload validation
export function validateFileUpload(file: File, allowedTypes: string[], maxSizeMB: number = 5): { valid: boolean; error?: string } {
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }

  // Check file name for malicious patterns
  const fileName = file.name;
  if (detectXSS(fileName) || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return { valid: false, error: 'Invalid file name' };
  }

  return { valid: true };
}

// URL validation with enhanced security checks
export function validateSecureURL(url: string): { valid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTPS in production
    if (window.location.protocol === 'https:' && parsedUrl.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs are allowed' };
    }

    // Block localhost and private IP ranges in production
    if (window.location.hostname !== 'localhost') {
      const hostname = parsedUrl.hostname;
      if (hostname === 'localhost' || 
          hostname.startsWith('127.') || 
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
        return { valid: false, error: 'Private network URLs are not allowed' };
      }
    }

    // Check for suspicious protocols
    const suspiciousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (suspiciousProtocols.some(protocol => url.toLowerCase().startsWith(protocol))) {
      return { valid: false, error: 'URL protocol not allowed' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// Comprehensive input sanitization for edge functions
export function sanitizeEdgeFunctionInput(input: any): any {
  if (typeof input === 'string') {
    return sanitizeAndValidateInput(input);
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeEdgeFunctionInput(item));
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      // Sanitize both keys and values
      const sanitizedKey = sanitizeText(key);
      sanitized[sanitizedKey] = sanitizeEdgeFunctionInput(value);
    }
    return sanitized;
  }
  
  return input;
}