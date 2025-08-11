import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { EdgeLogger } from '../_shared/logger.ts';
import { EdgeErrorHandler } from '../_shared/errorHandler.ts';
import { ResponseBuilder, defaultCorsHeaders } from '../_shared/responseUtils.ts';

interface TestEmailRequest {
  email: string;
  testType?: 'basic' | 'detailed';
}

const handler = async (req: Request): Promise<Response> => {
  const logger = new EdgeLogger('test-email');
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
    logger.info('Test email request received');

    // Validate environment
    const envValidation = errorHandler.validateEnvironment(['RESEND_API_KEY']);
    if (!envValidation.isValid) {
      logger.error('Environment validation failed', {}, new Error(envValidation.error!));
      return errorHandler.createErrorResponse(
        new Error(envValidation.error!), 
        500, 
        { operation: 'environment_validation' }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const resend = new Resend(resendApiKey);

    // Validate and parse request body
    const bodyValidation = await errorHandler.validateJsonBody<TestEmailRequest>(req);
    if (!bodyValidation.isValid) {
      logger.error('Request body validation failed', {}, new Error(bodyValidation.error));
      return errorHandler.createErrorResponse(
        new Error(bodyValidation.error), 
        400, 
        { operation: 'request_validation' }
      );
    }

    const { email, testType = 'basic' } = bodyValidation.data;

    logger.info('Test email parameters validated', { 
      operation: 'email_test_init',
      email, 
      testType 
    });

    const emailSubject = 'OTCping Email Test';
    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Email Test from OTCping</h2>
            <p>This is a test email to verify that email sending is working correctly.</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Test Type:</strong> ${testType}</p>
              <p style="margin: 5px 0 0 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            </div>
            <p>If you received this email, the email system is working correctly!</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="font-size: 14px; color: #64748b;">
              This is a test email from OTCping's notification system.
            </p>
          </div>
        </body>
      </html>
    `;

    logger.apiCall('send_test_email', 'resend', {
      operation: 'test_email_sending',
      email,
      testType
    });

    // Use Resend's email sending API
    const emailResponse = await resend.emails.send({
      from: 'OTCping <no-reply@otcping.com>',
      to: [email],
      subject: emailSubject,
      html: emailBody,
    });

    if (emailResponse.error) {
      logger.error('Error sending test email', {
        operation: 'test_email_failed',
        email,
        error: emailResponse.error
      }, emailResponse.error);
      
      return errorHandler.createErrorResponse(
        emailResponse.error, 
        500, 
        { operation: 'test_email_send', email, emailService: 'resend' },
        'EMAIL_SEND_FAILED'
      );
    }

    logger.apiSuccess('send_test_email', {
      operation: 'test_email_sent',
      email,
      emailId: emailResponse.data?.id,
      testType
    });

    return responseBuilder.success({ 
      message: 'Test email sent successfully',
      email: email,
      emailId: emailResponse.data?.id,
      timestamp: new Date().toISOString(),
      emailService: 'resend'
    });

  } catch (error) {
    logger.apiError('test_email', error as Error, { operation: 'test_email_failed' });
    return errorHandler.createErrorResponse(
      error as Error, 
      500, 
      { operation: 'test_email' },
      'TEST_EMAIL_FAILED'
    );
  }
};

serve(handler);