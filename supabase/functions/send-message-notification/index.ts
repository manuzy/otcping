import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const { chatId, senderDisplayName, messageContent, recipientUserId }: NotificationRequest = await req.json();

    console.log('Processing notification request:', { chatId, senderDisplayName, recipientUserId, messageContent: messageContent.substring(0, 100) + '...' });

    // Get recipient's notification settings
    const { data: notificationSettings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('email, enable_email, email_frequency')
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

    // Check the user's email frequency preference
    const emailFrequency = notificationSettings.email_frequency || 'first_only';
    
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
        console.error('Error getting current message:', currentMsgError);
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
          console.error('Error checking message history:', historyError);
          throw historyError;
        }

        console.log(`Found ${previousMessages.length} previous messages from this sender in chat ${chatId}`);

        // Only send notification if this is the first message from this sender in the chat
        if (previousMessages.length > 0) {
          console.log('Not the first message from this sender, skipping notification');
          return new Response(JSON.stringify({ success: false, message: 'Not first message from sender' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }
    
    console.log(`Email frequency setting: ${emailFrequency} - proceeding with notification`);

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
    console.log('Attempting to send notification email to:', notificationSettings.email);
    
    const emailResponse = await resend.emails.send({
      from: 'OTCping <no-reply@otcping.com>',
      to: [notificationSettings.email],
      subject: emailSubject,
      html: emailBody,
    });

    if (emailResponse.error) {
      console.error('Failed to send notification email:', {
        error: emailResponse.error,
        recipient: notificationSettings.email,
        chatId: chatId,
        senderDisplayName: senderDisplayName
      });
      throw emailResponse.error;
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