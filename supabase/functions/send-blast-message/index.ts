import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { blastMessageId } = await req.json();

    if (!blastMessageId) {
      return new Response(
        JSON.stringify({ error: 'Missing blastMessageId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing blast message:', blastMessageId);

    // Get blast message details
    const { data: blastMessage, error: blastError } = await supabase
      .from('blast_messages')
      .select('*')
      .eq('id', blastMessageId)
      .single();

    if (blastError || !blastMessage) {
      console.error('Error fetching blast message:', blastError);
      return new Response(
        JSON.stringify({ error: 'Blast message not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('blast_recipients')
      .select('*')
      .eq('blast_message_id', blastMessageId)
      .eq('status', 'pending');

    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recipients' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let successCount = 0;
    let failureCount = 0;

    // Process each recipient
    for (const recipient of recipients || []) {
      try {
        console.log(`Processing recipient: ${recipient.id} (${recipient.recipient_type})`);

        if (recipient.recipient_type === 'user') {
          // Send direct message to user
          await sendDirectMessage(supabase, blastMessage, recipient.recipient_id);
        } else if (recipient.recipient_type === 'chat') {
          // Send message to chat
          await sendChatMessage(supabase, blastMessage, recipient.recipient_id);
        } else if (recipient.recipient_type === 'institution') {
          // Send to all institution members
          await sendInstitutionMessage(supabase, blastMessage, recipient.recipient_id);
        }

        // Update recipient status to sent
        await supabase
          .from('blast_recipients')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq('id', recipient.id);

        successCount++;
        console.log(`Successfully sent to recipient: ${recipient.id}`);

      } catch (error) {
        console.error(`Failed to send to recipient ${recipient.id}:`, error);
        
        // Update recipient status to failed
        await supabase
          .from('blast_recipients')
          .update({ 
            status: 'failed',
            error_message: error.message 
          })
          .eq('id', recipient.id);

        failureCount++;
      }
    }

    // Update blast message statistics
    await supabase
      .from('blast_messages')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        successful_sends: successCount,
        failed_sends: failureCount
      })
      .eq('id', blastMessageId);

    console.log(`Blast message ${blastMessageId} processed: ${successCount} success, ${failureCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        successCount, 
        failureCount,
        totalRecipients: recipients?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-blast-message function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendDirectMessage(supabase: any, blastMessage: any, userId: string) {
  // Create or get existing direct chat between sender and recipient
  const { data: existingChat } = await supabase
    .from('chats')
    .select('id')
    .eq('created_by', blastMessage.sender_id)
    .eq('is_public', false)
    .eq('trade_id', null);

  let chatId;
  
  if (existingChat && existingChat.length > 0) {
    // Check if this chat has the target user as participant
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('chat_id', existingChat[0].id)
      .eq('user_id', userId)
      .single();
    
    if (participant) {
      chatId = existingChat[0].id;
    }
  }

  if (!chatId) {
    // Create new direct chat
    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert({
        name: `Blast: ${blastMessage.title}`,
        created_by: blastMessage.sender_id,
        is_public: false
      })
      .select()
      .single();

    if (chatError) throw chatError;
    chatId = newChat.id;

    // Add participants
    await supabase
      .from('chat_participants')
      .insert([
        { chat_id: chatId, user_id: blastMessage.sender_id },
        { chat_id: chatId, user_id: userId }
      ]);
  }

  // Send the message
  await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: blastMessage.sender_id,
      content: `📢 ${blastMessage.title}\n\n${blastMessage.content}`,
      type: 'message'
    });

  // Increment unread count for recipient
  await supabase.rpc('increment_unread_count', {
    chat_id: chatId,
    sender_id: blastMessage.sender_id
  });
}

async function sendChatMessage(supabase: any, blastMessage: any, chatId: string) {
  // Send message to existing chat
  await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: blastMessage.sender_id,
      content: `📢 BLAST: ${blastMessage.title}\n\n${blastMessage.content}`,
      type: 'message'
    });

  // Increment unread count for all participants except sender
  await supabase.rpc('increment_unread_count', {
    chat_id: chatId,
    sender_id: blastMessage.sender_id
  });
}

async function sendInstitutionMessage(supabase: any, blastMessage: any, institutionId: string) {
  // Get all institution members
  const { data: members } = await supabase
    .from('institution_members')
    .select('user_id')
    .eq('institution_id', institutionId);

  // Send to each member
  for (const member of members || []) {
    if (member.user_id !== blastMessage.sender_id) {
      await sendDirectMessage(supabase, blastMessage, member.user_id);
    }
  }
}