import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: []  // No attributes allowed
  });
}

/**
 * Validates and sanitizes text input
 */
export function sanitizeText(input: string, maxLength: number = 500): string {
  if (!input) return '';
  
  // Remove any HTML tags and trim whitespace
  const sanitized = sanitizeHtml(input.trim());
  
  // Limit length
  return sanitized.substring(0, maxLength);
}

/**
 * Validates URL format and ensures it's from trusted domains
 * Returns validation result with success status and error message
 */
export function validateAvatarUrl(url: string): { isValid: boolean; url: string | null; error?: string } {
  if (!url) return { isValid: true, url: null };
  
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTPS
    if (urlObj.protocol !== 'https:') {
      return { isValid: false, url: null, error: 'Only HTTPS URLs are allowed' };
    }
    
    // Trusted domains for avatar hosting
    const trustedDomains = [
      'images.unsplash.com',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
      'cdn.jsdelivr.net',
      'ui-avatars.com',
      'avataaars.io',
      'gravatar.com',
      'www.gravatar.com',
      'secure.gravatar.com',
      'cloudflare-ipfs.com',
      'ipfs.io',
      'peqqefvohjemxhuyvzbg.supabase.co' // Supabase Storage domain
    ];
    
    const isValidDomain = trustedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );
    
    if (!isValidDomain) {
      return { isValid: false, url: null, error: `Domain '${urlObj.hostname}' is not in the trusted list` };
    }
    
    // For API-based avatar services, allow URLs without file extensions
    const apiDomains = ['avatars.githubusercontent.com', 'ui-avatars.com', 'avataaars.io', 'gravatar.com', 'www.gravatar.com', 'secure.gravatar.com'];
    const isApiDomain = apiDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );
    
    // Check for valid image extension (required for non-API domains)
    if (!isApiDomain) {
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const fullUrl = urlObj.pathname + urlObj.search;
      const hasValidExtension = validExtensions.some(ext => 
        fullUrl.toLowerCase().includes(ext)
      );
      
      if (!hasValidExtension) {
        return { isValid: false, url: null, error: 'URL must contain a valid image extension (.jpg, .jpeg, .png, .gif, .webp)' };
      }
    }
    
    // Limit URL length
    if (url.length > 500) {
      return { isValid: false, url: null, error: 'URL is too long (max 500 characters)' };
    }
    
    // Check for suspicious query parameters
    const suspiciousParams = ['javascript:', 'data:', 'vbscript:', 'onclick', 'onerror'];
    const queryString = urlObj.search.toLowerCase();
    if (suspiciousParams.some(param => queryString.includes(param))) {
      return { isValid: false, url: null, error: 'URL contains suspicious parameters' };
    }
    
    return { isValid: true, url };
  } catch {
    return { isValid: false, url: null, error: 'Invalid URL format' };
  }
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use validateAvatarUrl instead for better error handling
 */
export function validateAvatarUrlLegacy(url: string): string | null {
  const result = validateAvatarUrl(url);
  return result.url;
}

/**
 * Sanitizes display name input
 */
export function sanitizeDisplayName(input: string): string {
  if (!input) return '';
  
  const sanitized = sanitizeText(input, 100);
  
  // Remove special characters that could be problematic
  return sanitized.replace(/[<>\"'&]/g, '');
}