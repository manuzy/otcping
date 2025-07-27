import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestEmailRequest {
  email: string;
  testType?: 'basic' | 'detailed';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const resend = new Resend(resendApiKey);

    const { email, testType = 'basic' }: TestEmailRequest = await req.json();

    console.log('Testing email sending to:', email, 'with type:', testType);

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

    console.log('Attempting to send test email via Resend...');

    // Use Resend's email sending API
    const emailResponse = await resend.emails.send({
      from: 'OTCping <onboarding@resend.dev>',
      to: [email],
      subject: emailSubject,
      html: emailBody,
    });

    if (emailResponse.error) {
      console.error('Error sending test email:', emailResponse.error);
      
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Failed to send email',
        details: emailResponse.error.message,
        emailService: 'resend'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Test email sent successfully to:', email);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Test email sent successfully',
      email: email,
      emailId: emailResponse.data?.id,
      timestamp: new Date().toISOString(),
      emailService: 'resend'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in test-email function:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);