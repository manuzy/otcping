import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  chatId: string;
  senderDisplayName: string;
  messageContent: string;
  recipientUserId: string;
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { chatId, senderDisplayName, messageContent, recipientUserId }: NotificationRequest = await req.json();

    console.log('Processing notification request:', { chatId, senderDisplayName, recipientUserId });

    // Get recipient's notification settings
    const { data: notificationSettings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('email, enable_email')
      .eq('user_id', recipientUserId)
      .single();

    if (settingsError) {
      console.log('No notification settings found for user:', recipientUserId);
      return new Response(JSON.stringify({ success: false, message: 'No notification settings found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if email notifications are enabled and email is provided
    if (!notificationSettings.enable_email || !notificationSettings.email) {
      console.log('Email notifications disabled or no email provided for user:', recipientUserId);
      return new Response(JSON.stringify({ success: false, message: 'Email notifications not enabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this is the first message between these users
    const { data: messageHistory, error: historyError } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('Error checking message history:', historyError);
      throw historyError;
    }

    console.log(`Found ${messageHistory.length} messages in chat ${chatId}`);

    // Only send notification for the first message in a chat
    if (messageHistory.length > 0) {
      console.log('Not the first message in chat, skipping notification');
      return new Response(JSON.stringify({ success: false, message: 'Not first message' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
              <a href="https://otcping.lovable.app" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
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

    // Use Supabase's auth.admin.sendEmail with the configured SMTP
    const { error: emailError } = await supabase.auth.admin.sendEmail({
      email: notificationSettings.email,
      subject: emailSubject,
      html: emailBody,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      throw emailError;
    }

    console.log('Email notification sent successfully to:', notificationSettings.email);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email notification sent',
      email: notificationSettings.email 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-message-notification function:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);