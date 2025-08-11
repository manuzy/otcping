import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';
export function EmailTestPanel() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const sendTestEmail = async () => {
    if (!email) {
      notifications.warning({
        title: "Email Required",
        description: "Please enter an email address"
      });
      return;
    }
    setLoading(true);
    try {
      logger.debug('Sending test email', {
        component: 'EmailTestPanel',
        operation: 'send_test_email',
        metadata: { email }
      });
      const {
        data,
        error
      } = await supabase.functions.invoke('test-email', {
        body: {
          email: email,
          testType: 'basic'
        }
      });
      if (error) {
        logger.error('Test email function error', {
          component: 'EmailTestPanel',
          operation: 'send_test_email',
          metadata: { email }
        }, error);
        notifications.error({
          title: "Error",
          description: `Failed to send test email: ${error.message}`
        });
        return;
      }
      logger.debug('Test email response received', {
        component: 'EmailTestPanel',
        operation: 'send_test_email',
        metadata: { email, success: data?.success }
      });
      if (data?.success) {
        notifications.success({
          title: "Success",
          description: `Test email sent to ${email}. Check your inbox!`
        });
      } else {
        notifications.error({
          title: "Error",
          description: data?.details || "Failed to send test email"
        });
      }
    } catch (error: any) {
      logger.error('Test email exception', {
        component: 'EmailTestPanel',
        operation: 'send_test_email',
        metadata: { email }
      }, error);
      notifications.error({
        title: "Error",
        description: `Exception: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };
  return <Card className="w-full max-w-md">
      
      <CardContent className="space-y-4 my-[10px]">
        <div>
          <Input type="email" placeholder="Enter test email address" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <Button onClick={sendTestEmail} disabled={loading} className="w-full">
          {loading ? 'Sending...' : 'Send Test Email'}
        </Button>
      </CardContent>
    </Card>;
}