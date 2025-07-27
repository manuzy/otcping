import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function EmailTestPanel() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendTestEmail = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Sending test email to:', email);
      
      const { data, error } = await supabase.functions.invoke('test-email', {
        body: { 
          email: email,
          testType: 'basic'
        }
      });

      if (error) {
        console.error('Test email error:', error);
        toast({
          title: "Error",
          description: `Failed to send test email: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Test email response:', data);
      
      if (data?.success) {
        toast({
          title: "Success",
          description: `Test email sent to ${email}. Check your inbox!`,
        });
      } else {
        toast({
          title: "Error",
          description: data?.details || "Failed to send test email",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Test email exception:', error);
      toast({
        title: "Error",
        description: `Exception: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Email System Test</CardTitle>
        <CardDescription>
          Test if Supabase email sending is working
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="Enter test email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button 
          onClick={sendTestEmail} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Sending...' : 'Send Test Email'}
        </Button>
      </CardContent>
    </Card>
  );
}