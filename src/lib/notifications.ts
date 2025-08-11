import { toast } from '@/hooks/use-toast';
import { logger } from './logger';
import { Button } from '@/components/ui/button';

export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface NotificationOptions {
  title?: string;
  description: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

class NotificationService {
  private showNotification(
    type: NotificationType,
    options: NotificationOptions
  ) {
    const { title, description, duration, action } = options;

    // Log the notification
    logger.info(`Notification: ${type}`, {
      metadata: { title, description }
    });

    // Map to toast variants
    const variant = type === 'error' ? 'destructive' : 'default';

    toast({
      title: title || this.getDefaultTitle(type),
      description,
      variant,
      duration,
    });

    // Handle action separately for now - toast actions need specific implementation
    if (action) {
      setTimeout(() => {
        // For now, we'll just log the action - can be enhanced later
        logger.info('Toast action available', { metadata: { actionLabel: action.label } });
      }, 100);
    }
  }

  private getDefaultTitle(type: NotificationType): string {
    switch (type) {
      case NotificationType.SUCCESS:
        return 'Success';
      case NotificationType.ERROR:
        return 'Error';
      case NotificationType.WARNING:
        return 'Warning';
      case NotificationType.INFO:
        return 'Info';
      default:
        return '';
    }
  }

  success(options: NotificationOptions) {
    this.showNotification(NotificationType.SUCCESS, options);
  }

  error(options: NotificationOptions) {
    this.showNotification(NotificationType.ERROR, options);
  }

  warning(options: NotificationOptions) {
    this.showNotification(NotificationType.WARNING, options);
  }

  info(options: NotificationOptions) {
    this.showNotification(NotificationType.INFO, options);
  }

  // Predefined common notifications
  authSuccess() {
    this.success({
      description: 'Successfully signed in!'
    });
  }

  authError() {
    this.error({
      description: 'Failed to sign in. Please try again.'
    });
  }

  signedOut() {
    this.info({
      description: 'You have been signed out.'
    });
  }

  saveSuccess(itemType = 'item') {
    this.success({
      description: `${itemType} saved successfully!`
    });
  }

  saveError(itemType = 'item') {
    this.error({
      description: `Failed to save ${itemType}. Please try again.`
    });
  }

  deleteSuccess(itemType = 'item') {
    this.success({
      description: `${itemType} deleted successfully!`
    });
  }

  deleteError(itemType = 'item') {
    this.error({
      description: `Failed to delete ${itemType}. Please try again.`
    });
  }

  updateSuccess(itemType = 'item') {
    this.success({
      description: `${itemType} updated successfully!`
    });
  }

  updateError(itemType = 'item') {
    this.error({
      description: `Failed to update ${itemType}. Please try again.`
    });
  }

  networkError() {
    this.error({
      title: 'Connection Problem',
      description: 'Please check your internet connection and try again.',
      action: {
        label: 'Retry',
        onClick: () => window.location.reload()
      }
    });
  }

  permissionError() {
    this.error({
      title: 'Permission Denied',
      description: 'You don\'t have permission to perform this action.'
    });
  }

  validationError(field?: string) {
    this.error({
      title: 'Invalid Input',
      description: field 
        ? `Please check the ${field} field and try again.`
        : 'Please check your input and try again.'
    });
  }

  loadingError(itemType = 'data') {
    this.error({
      description: `Failed to load ${itemType}. Please refresh the page.`,
      action: {
        label: 'Refresh',
        onClick: () => window.location.reload()
      }
    });
  }

  copiedToClipboard(itemType = 'text') {
    this.success({
      description: `${itemType} copied to clipboard!`
    });
  }

  featureNotAvailable() {
    this.info({
      title: 'Coming Soon',
      description: 'This feature is not available yet.'
    });
  }

  maintenanceMode() {
    this.warning({
      title: 'Maintenance Mode',
      description: 'Some features may be temporarily unavailable.'
    });
  }
}

export const notifications = new NotificationService();