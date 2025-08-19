import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, User, Wallet, Mail, MessageCircle, Users } from 'lucide-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useBetaUsers } from '@/hooks/useBetaUsers';

const betaApplicationSchema = z.object({
  display_name: z.string().min(2, 'Name must be at least 2 characters'),
  wallet_address: z.string().min(42, 'Please enter a valid wallet address'),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  telegram: z.string().optional(),
  referral_name: z.string().optional(),
});

type BetaApplicationForm = z.infer<typeof betaApplicationSchema>;

interface BetaApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BetaApplicationModal({ open, onOpenChange }: BetaApplicationModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const { address } = useWalletAuth();
  const { addBetaApplication } = useBetaUsers();

  const form = useForm<BetaApplicationForm>({
    resolver: zodResolver(betaApplicationSchema),
    defaultValues: {
      display_name: '',
      wallet_address: address || '',
      email: '',
      telegram: '',
      referral_name: '',
    },
  });

  const onSubmit = async (data: BetaApplicationForm) => {
    const result = await addBetaApplication({
      display_name: data.display_name,
      wallet_address: data.wallet_address,
      email: data.email || undefined,
      telegram: data.telegram || undefined,
      referral_name: data.referral_name || undefined,
    });

    if (result.success) {
      setSubmitted(true);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    if (submitted) {
      setSubmitted(false);
      form.reset();
    }
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Application Submitted!</h3>
            <p className="text-muted-foreground mb-6">
              Thank you for your interest in joining our beta program. We'll review your 
              application and get back to you within 2-3 business days.
            </p>
            <Button onClick={handleClose} className="w-full">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="secondary" className="px-2 py-1">
              Beta Application
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Fill out this form to apply for beta access to OTCping. We'll review your 
            application and contact you if approved.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="wallet_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Wallet Address *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="0x..." 
                      {...field} 
                      readOnly={!!address}
                      className={address ? "bg-muted" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                  {address && (
                    <p className="text-xs text-muted-foreground">
                      Using connected wallet address
                    </p>
                  )}
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="your@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telegram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Telegram
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="@username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="referral_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Referral Name (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Who referred you to OTCping?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium">Please provide at least one contact method:</p>
              <p>We need either an email address or Telegram handle to contact you about your application status.</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="flex-1"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}