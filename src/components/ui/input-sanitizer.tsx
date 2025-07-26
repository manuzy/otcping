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
 */
export function validateAvatarUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTPS
    if (urlObj.protocol !== 'https:') return null;
    
    // Trusted domains for avatar hosting
    const trustedDomains = [
      'images.unsplash.com',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
      'cdn.jsdelivr.net',
      'ui-avatars.com',
      'gravatar.com',
      'www.gravatar.com',
      'secure.gravatar.com',
      'cloudflare-ipfs.com',
      'ipfs.io'
    ];
    
    const isValidDomain = trustedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );
    
    if (!isValidDomain) return null;
    
    // Check for valid image extension
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasValidExtension = validExtensions.some(ext => 
      urlObj.pathname.toLowerCase().includes(ext)
    );
    
    if (!hasValidExtension) return null;
    
    // Limit URL length
    if (url.length > 500) return null;
    
    // Check for suspicious query parameters
    const suspiciousParams = ['javascript:', 'data:', 'vbscript:', 'onclick', 'onerror'];
    const queryString = urlObj.search.toLowerCase();
    if (suspiciousParams.some(param => queryString.includes(param))) return null;
    
    return url;
  } catch {
    return null;
  }
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