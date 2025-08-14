// Security headers configuration and helpers

export const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://peqqefvohjemxhuyvzbg.supabase.co wss://peqqefvohjemxhuyvzbg.supabase.co https://api.1inch.dev https://api.coingecko.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'"
  ].join('; '),
  
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()'
  ].join(', ')
};

// Helper to validate content types
export const ALLOWED_CONTENT_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'text/plain'],
  uploads: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
};

export function validateContentType(contentType: string, category: keyof typeof ALLOWED_CONTENT_TYPES): boolean {
  return ALLOWED_CONTENT_TYPES[category].includes(contentType.toLowerCase());
}

// Helper to sanitize file names
export function sanitizeFileName(fileName: string): string {
  // Remove any path traversal attempts and dangerous characters
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .substring(0, 255);
}

// Helper to validate file size
export function validateFileSize(size: number, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
}

// Security validation for URLs
export function validateURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS in production
    if (import.meta.env.PROD && parsed.protocol !== 'https:') {
      return false;
    }
    
    // Block localhost and private IP ranges in production
    if (import.meta.env.PROD) {
      const hostname = parsed.hostname;
      if (
        hostname === 'localhost' ||
        hostname.startsWith('127.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.match(/^172\.(1[6-9]|2\d|3[01])\./)
      ) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

// Helper to create secure fetch options
export function createSecureFetchOptions(options: RequestInit = {}): RequestInit {
  const secureHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Requested-With': 'XMLHttpRequest',
    ...options.headers
  };

  return {
    ...options,
    headers: secureHeaders,
    credentials: 'same-origin',
    cache: 'no-store' // Prevent caching of sensitive data
  };
}

// Helper to validate origins for CORS
export const ALLOWED_ORIGINS = [
  'https://peqqefvohjemxhuyvzbg.supabase.co',
  ...(import.meta.env.DEV ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : [])
];

export function validateOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin);
}

// Secure random string generation
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Helper to mask sensitive data in logs
export function maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'authorization',
    'wallet_address', 'signature', 'private_key', 'seed',
    'ssn', 'national_id', 'passport', 'drivers_license'
  ];

  const masked = Array.isArray(data) ? [...data] : { ...data };

  for (const key in masked) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      const value = masked[key];
      if (typeof value === 'string' && value.length > 8) {
        masked[key] = value.substring(0, 4) + '***' + value.substring(value.length - 4);
      } else {
        masked[key] = '***';
      }
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
}

// Input sanitization helpers
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limit length
}

// Helper to check for SQL injection patterns
export function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(;|\-\-|\/\*|\*\/|xp_|sp_)/gi,
    /'[^']*'|"[^"]*"/gi
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}