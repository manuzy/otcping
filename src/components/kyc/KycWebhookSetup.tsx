import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, ExternalLink, Webhook, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function KycWebhookSetup() {
  const webhookUrl = 'https://peqqefvohjemxhuyvzbg.supabase.co/functions/v1/kyc-webhook';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const openSumsubDashboard = () => {
    window.open('https://cockpit.sumsub.com/checkus#/integration/webhooks', '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Webhook Configuration
        </CardTitle>
        <CardDescription>
          Configure Sumsub webhooks to receive real-time verification updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Required:</strong> Set up webhooks in your Sumsub dashboard to enable real-time KYC status updates.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Label>Webhook URL</Label>
          <div className="flex gap-2">
            <Input
              value={webhookUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(webhookUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Copy this URL and add it to your Sumsub webhook configuration
          </p>
        </div>

        <div className="space-y-3">
          <Label>Webhook Events</Label>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">applicantReviewed</Badge>
            <Badge variant="secondary">applicantPending</Badge>
            <Badge variant="secondary">applicantOnBoarding</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Subscribe to these events in your Sumsub webhook settings
          </p>
        </div>

        <div className="space-y-3">
          <Label>Setup Instructions</Label>
          <ol className="text-sm space-y-2 ml-4 list-decimal text-muted-foreground">
            <li>Open your Sumsub dashboard webhook settings</li>
            <li>Add a new webhook endpoint with the URL above</li>
            <li>Enable the required events: applicantReviewed, applicantPending, applicantOnBoarding</li>
            <li>Set the webhook to active status</li>
            <li>Test the webhook connection</li>
          </ol>
        </div>

        <Button onClick={openSumsubDashboard} className="w-full">
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Sumsub Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}