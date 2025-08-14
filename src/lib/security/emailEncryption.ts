import CryptoJS from 'crypto-js';

class EmailEncryption {
  private encryptionKey: string;

  constructor() {
    // Generate a persistent encryption key based on user session
    this.encryptionKey = this.generateEncryptionKey();
  }

  private generateEncryptionKey(): string {
    // Use a combination of factors to create a consistent key per user session
    const userAgent = navigator.userAgent;
    const timestamp = sessionStorage.getItem('session-start') || Date.now().toString();
    
    if (!sessionStorage.getItem('session-start')) {
      sessionStorage.setItem('session-start', timestamp);
    }

    return CryptoJS.SHA256(userAgent + timestamp).toString();
  }

  encryptEmail(email: string): string {
    if (!email || email.length === 0) {
      return '';
    }

    try {
      const encrypted = CryptoJS.AES.encrypt(email, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Email encryption failed:', error);
      return email; // Fallback to unencrypted if encryption fails
    }
  }

  decryptEmail(encryptedEmail: string): string {
    if (!encryptedEmail || encryptedEmail.length === 0) {
      return '';
    }

    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedEmail, this.encryptionKey);
      const email = decrypted.toString(CryptoJS.enc.Utf8);
      
      // Validate that decryption was successful
      if (email && email.includes('@')) {
        return email;
      }
      
      // If decryption failed, assume it's already plaintext
      return encryptedEmail;
    } catch (error) {
      console.error('Email decryption failed:', error);
      return encryptedEmail; // Fallback to encrypted value if decryption fails
    }
  }

  // Helper method to check if an email looks encrypted
  isEncrypted(email: string): boolean {
    // AES encrypted strings are base64 and don't contain @ symbols
    return email.length > 20 && !email.includes('@') && /^[A-Za-z0-9+/=]+$/.test(email);
  }

  // Clear encryption key (on logout)
  clearKey(): void {
    sessionStorage.removeItem('session-start');
    this.encryptionKey = '';
  }
}

export const emailEncryption = new EmailEncryption();

// Helper functions for easy use
export function encryptEmailForStorage(email: string): string {
  return emailEncryption.encryptEmail(email);
}

export function decryptEmailFromStorage(encryptedEmail: string): string {
  return emailEncryption.decryptEmail(encryptedEmail);
}

export function isEmailEncrypted(email: string): boolean {
  return emailEncryption.isEncrypted(email);
}