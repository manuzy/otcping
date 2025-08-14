import { generateCSRFToken, validateCSRFToken } from '../inputValidation';

class CSRFProtection {
  private token: string | null = null;
  private readonly storageKey = 'csrf-token';

  constructor() {
    this.initializeToken();
  }

  private initializeToken(): void {
    // Try to get existing token from sessionStorage
    this.token = sessionStorage.getItem(this.storageKey);
    
    // Generate new token if none exists
    if (!this.token) {
      this.refreshToken();
    }
  }

  refreshToken(): string {
    this.token = generateCSRFToken();
    sessionStorage.setItem(this.storageKey, this.token);
    return this.token;
  }

  getToken(): string {
    if (!this.token) {
      this.refreshToken();
    }
    return this.token!;
  }

  validateToken(submittedToken: string): boolean {
    if (!this.token || !submittedToken) {
      return false;
    }
    return validateCSRFToken(submittedToken, this.token);
  }

  // Generate headers for API requests
  getHeaders(): Record<string, string> {
    return {
      'X-CSRF-Token': this.getToken()
    };
  }

  // Middleware function for sensitive operations
  protected<T extends (...args: any[]) => Promise<any>>(
    operation: T,
    requiredToken?: string
  ): T {
    return (async (...args: any[]) => {
      if (requiredToken && !this.validateToken(requiredToken)) {
        throw new Error('CSRF token validation failed');
      }
      return operation(...args);
    }) as T;
  }

  // Clear token (on logout)
  clearToken(): void {
    this.token = null;
    sessionStorage.removeItem(this.storageKey);
  }
}

export const csrfProtection = new CSRFProtection();

// Decorator for React hooks/components to add CSRF protection
export function withCSRFProtection<T extends Record<string, any>>(
  hookOrComponent: T,
  sensitiveOperations: (keyof T)[]
): T {
  const protected = { ...hookOrComponent };

  sensitiveOperations.forEach((operation) => {
    const originalMethod = protected[operation];
    if (typeof originalMethod === 'function') {
      protected[operation] = csrfProtection.protected(originalMethod);
    }
  });

  return protected;
}

// Helper for form submissions
export function addCSRFToFormData(formData: FormData): FormData {
  formData.append('csrf_token', csrfProtection.getToken());
  return formData;
}

// Helper for JSON payloads
export function addCSRFToPayload<T extends Record<string, any>>(payload: T): T & { csrf_token: string } {
  return {
    ...payload,
    csrf_token: csrfProtection.getToken()
  };
}