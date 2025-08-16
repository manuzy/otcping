import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import { EdgeLogger } from '../_shared/logger.ts';
import { ResponseBuilder, defaultCorsHeaders } from '../_shared/responseUtils.ts';
import { EdgeErrorHandler } from '../_shared/errorHandler.ts';

const logger = new EdgeLogger('process-scheduled-messages');
const corsHeaders = defaultCorsHeaders;

Deno.serve(async (req) => {
  const responseBuilder = new ResponseBuilder(corsHeaders);
  const errorHandler = new EdgeErrorHandler(logger, corsHeaders);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return ResponseBuilder.cors(corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return errorHandler.createErrorResponse('Missing Supabase configuration', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    logger.info('Processing scheduled messages', { timestamp: new Date().toISOString() });

    // Get messages that are due to be sent
    const { data: scheduledMessages, error: fetchError } = await supabase
      .from('scheduled_messages')
      .select(`
        id,
        chat_id,
        sender_id,
        content,
        scheduled_for,
        timezone,
        recurring_pattern,
        mentions,
        template_id
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());

    if (fetchError) {
      logger.error('Failed to fetch scheduled messages', {}, fetchError);
      return errorHandler.handleSupabaseError(fetchError, 'fetch scheduled messages');
    }

    if (!scheduledMessages || scheduledMessages.length === 0) {
      logger.info('No scheduled messages to process');
      return responseBuilder.success({ processed: 0, message: 'No messages to process' });
    }

    logger.info(`Found ${scheduledMessages.length} messages to process`);

    let processed = 0;
    let failed = 0;

    // Process each scheduled message
    for (const message of scheduledMessages) {
      try {
        // Insert the message into the messages table
        const { error: insertError } = await supabase
          .from('messages')
          .insert({
            chat_id: message.chat_id,
            sender_id: message.sender_id,
            content: message.content,
            type: 'message'
          });

        if (insertError) {
          logger.error(`Failed to send scheduled message ${message.id}`, {}, insertError);
          
          // Mark as failed
          await supabase
            .from('scheduled_messages')
            .update({ status: 'failed' })
            .eq('id', message.id);
          
          failed++;
          continue;
        }

        // Handle mentions if any
        if (message.mentions && message.mentions.length > 0) {
          // Get the created message ID for mentions
          const { data: createdMessage } = await supabase
            .from('messages')
            .select('id')
            .eq('chat_id', message.chat_id)
            .eq('sender_id', message.sender_id)
            .eq('content', message.content)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (createdMessage) {
            const mentionInserts = message.mentions.map(userId => ({
              message_id: createdMessage.id,
              mentioned_user_id: userId
            }));

            await supabase
              .from('message_mentions')
              .insert(mentionInserts);
          }
        }

        // Handle recurring patterns
        if (message.recurring_pattern) {
          const nextScheduledDate = calculateNextRecurrence(
            new Date(message.scheduled_for),
            message.recurring_pattern
          );

          if (nextScheduledDate) {
            // Create next occurrence
            await supabase
              .from('scheduled_messages')
              .insert({
                chat_id: message.chat_id,
                sender_id: message.sender_id,
                content: message.content,
                scheduled_for: nextScheduledDate.toISOString(),
                timezone: message.timezone,
                recurring_pattern: message.recurring_pattern,
                mentions: message.mentions,
                template_id: message.template_id,
                status: 'pending'
              });
          }
        }

        // Mark current message as sent
        await supabase
          .from('scheduled_messages')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', message.id);

        processed++;
        logger.info(`Successfully processed scheduled message ${message.id}`);

      } catch (error) {
        logger.error(`Error processing message ${message.id}`, {}, error);
        
        // Mark as failed
        await supabase
          .from('scheduled_messages')
          .update({ status: 'failed' })
          .eq('id', message.id);
        
        failed++;
      }
    }

    logger.info(`Processing complete`, { processed, failed, total: scheduledMessages.length });

    return responseBuilder.success({
      processed,
      failed,
      total: scheduledMessages.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Unexpected error processing scheduled messages', {}, error);
    return errorHandler.createErrorResponse(error);
  }
});

function calculateNextRecurrence(lastDate: Date, pattern: string): Date | null {
  const now = new Date();
  
  switch (pattern) {
    case 'daily':
      const nextDay = new Date(lastDate);
      nextDay.setDate(nextDay.getDate() + 1);
      return nextDay > now ? nextDay : null;
      
    case 'weekly':
      const nextWeek = new Date(lastDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek > now ? nextWeek : null;
      
    case 'monthly':
      const nextMonth = new Date(lastDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth > now ? nextMonth : null;
      
    case 'yearly':
      const nextYear = new Date(lastDate);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      return nextYear > now ? nextYear : null;
      
    default:
      return null;
  }
}