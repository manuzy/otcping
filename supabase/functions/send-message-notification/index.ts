import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { EdgeLogger } from '../_shared/logger.ts';
import { EdgeErrorHandler } from '../_shared/errorHandler.ts';
import { ResponseBuilder, defaultCorsHeaders } from '../_shared/responseUtils.ts';

interface NotificationRequest {
  chatId: string;
  senderDisplayName: string;
  messageContent: string;
  recipientUserId: string;
}

const handler = async (req: Request): Promise<Response> => {
  const logger = new EdgeLogger('send-message-notification');
  const errorHandler = new EdgeErrorHandler(logger, defaultCorsHeaders);
  const responseBuilder = new ResponseBuilder(defaultCorsHeaders);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return ResponseBuilder.cors(defaultCorsHeaders);
  }

  if (req.method !== 'POST') {
    logger.error('Invalid method', { operation: 'method_validation' }, new Error('Method not allowed'));
    return errorHandler.createErrorResponse(
      new Error('Method not allowed'), 
      405, 
      { operation: 'method_validation' }
    );
  }

  try {
    logger.info('Notification request received');

    // Validate environment
    const envValidation = errorHandler.validateEnvironment(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY']);
    if (!envValidation.isValid) {
      logger.error('Environment validation failed', {}, new Error(envValidation.error!));
      return errorHandler.createErrorResponse(
        new Error(envValidation.error!), 
        500, 
        { operation: 'environment_validation' }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Validate and parse request body
    const bodyValidation = await errorHandler.validateJsonBody<NotificationRequest>(req);
    if (!bodyValidation.isValid) {
      logger.error('Request body validation failed', {}, new Error(bodyValidation.error));
      return errorHandler.createErrorResponse(
        new Error(bodyValidation.error), 
        400, 
        { operation: 'request_validation' }
      );
    }

    const { chatId, senderDisplayName, messageContent, recipientUserId } = bodyValidation.data;

    logger.info('Processing notification request', { 
      operation: 'notification_processing',
      chatId, 
      senderDisplayName, 
      recipientUserId, 
      contentPreview: messageContent.substring(0, 100) + '...'
    });

    // Get recipient's notification settings
    const { data: notificationSettings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('email, enable_email, email_frequency')
      .eq('user_id', recipientUserId)
      .single();

    if (settingsError) {
      logger.info('No notification settings found for user', {
        operation: 'settings_lookup',
        recipientUserId,
        error: settingsError.message
      });
      return responseBuilder.success({ 
        success: false, 
        message: 'No notification settings found' 
      });
    }

    // Check if email notifications are enabled and email is provided
    if (!notificationSettings.enable_email || !notificationSettings.email) {
      logger.info('Email notifications disabled or no email provided', {
        operation: 'notification_disabled',
        recipientUserId,
        hasEmail: !!notificationSettings.email,
        emailEnabled: notificationSettings.enable_email
      });
      return responseBuilder.success({ 
        success: false, 
        message: 'Email notifications not enabled' 
      });
    }

    // Check the user's email frequency preference
    const emailFrequency = notificationSettings.email_frequency || 'first_only';
    
    logger.info('Email frequency preference retrieved', {
      operation: 'frequency_check',
      emailFrequency,
      recipientUserId
    });
    
    if (emailFrequency === 'first_only') {
      // Check if the sender has sent any previous messages in this chat
      // We need to get the current message first to use its timestamp
      const { data: currentMessage, error: currentMsgError } = await supabase
        .from('messages')
        .select('created_at, sender_id')
        .eq('chat_id', chatId)
        .eq('content', messageContent)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (currentMsgError) {
        logger.warn('Error getting current message, proceeding with notification', {
          operation: 'current_message_lookup',
          error: currentMsgError.message
        });
        // If we can't find the current message, proceed with sending notification
      } else {
        // Check for previous messages from the same sender in this chat
        const { data: previousMessages, error: historyError } = await supabase
          .from('messages')
          .select('id')
          .eq('chat_id', chatId)
          .eq('sender_id', currentMessage.sender_id)
          .lt('created_at', currentMessage.created_at);

        if (historyError) {
          logger.error('Error checking message history', {
            operation: 'message_history_check',
            chatId,
            senderId: currentMessage.sender_id
          }, historyError);
          throw historyError;
        }

        logger.info('Message history checked', {
          operation: 'message_history_result',
          chatId,
          previousMessageCount: previousMessages.length
        });

        // Only send notification if this is the first message from this sender in the chat
        if (previousMessages.length > 0) {
          logger.info('Not the first message from this sender, skipping notification', {
            operation: 'notification_skipped',
            chatId,
            previousMessageCount: previousMessages.length
          });
          return responseBuilder.success({ 
            success: false, 
            message: 'Not first message from sender' 
          });
        }
      }
    }
    
    logger.info('Proceeding with notification', {
      operation: 'notification_approved',
      emailFrequency
    });

    // Send email using Supabase's built-in email functionality (SMTP via Resend)
    const emailSubject = `New message from ${senderDisplayName} on OTCping`;
    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">New Message from ${senderDisplayName}</h2>
            <p>You have received a new message on OTCping:</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; font-style: italic;">"${messageContent.substring(0, 200)}${messageContent.length > 200 ? '...' : ''}"</p>
            </div>
            <p>
              <a href="https://otcping.com" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reply on OTCping
              </a>
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="font-size: 14px; color: #64748b;">
              You're receiving this because you have email notifications enabled in your OTCping settings. 
              You can disable these notifications anytime in your settings.
            </p>
          </div>
        </body>
      </html>
    `;

    // Use Resend API to send notification email
    logger.apiCall('send_email', 'resend', {
      operation: 'email_sending',
      recipient: notificationSettings.email
    });
    
    const emailResponse = await resend.emails.send({
      from: 'OTCping <no-reply@otcping.com>',
      to: [notificationSettings.email],
      subject: emailSubject,
      html: emailBody,
    });

    if (emailResponse.error) {
      logger.error('Failed to send notification email', {
        operation: 'email_send_failed',
        recipient: notificationSettings.email,
        chatId: chatId,
        senderDisplayName: senderDisplayName,
        error: emailResponse.error
      }, emailResponse.error);
      throw emailResponse.error;
    }

    logger.apiSuccess('send_email', {
      operation: 'email_sent',
      recipient: notificationSettings.email,
      emailId: emailResponse.data?.id
    });

    return responseBuilder.success({ 
      message: 'Email notification sent',
      email: notificationSettings.email 
    });

  } catch (error) {
    logger.apiError('send_notification', error as Error, { operation: 'notification_failed' });
    return errorHandler.createErrorResponse(
      error as Error, 
      500, 
      { operation: 'send_notification' },
      'NOTIFICATION_SEND_FAILED'
    );
  }
};

serve(handler);