import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Mail, Loader2, Settings, AlertTriangle } from "lucide-react";
import { EmailTestPanel } from "@/components/debug/EmailTestPanel";
import { SecurityDashboard } from "@/components/security/SecurityDashboard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
export default function Underground() {
  const {
    isAdmin,
    loading: adminLoading
  } = useIsAdmin();
  const {
    isAuthenticated,
    user,
    loading: authLoading
  } = useWalletAuth();
  const { settings, loading: settingsLoading, updating, updateSkipApproval } = useAdminSettings();

  // Combined loading state - wait for all auth states to stabilize
  const isLoading = user === undefined || authLoading || adminLoading;

  console.log('Underground auth state:', {
    user: user?.id,
    isAuthenticated,
    isAdmin,
    authLoading,
    adminLoading,
    isLoading
  });

  // Show loading while any auth state is being determined
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
  }

  // Only redirect after all loading is complete
  if (!isAuthenticated || !isAdmin) {
    console.log('Underground redirect triggered:', { isAuthenticated, isAdmin });
    return <Navigate to="/" replace />;
  }
  return <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Underground - Admin</h1>
            
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg border border-primary/20">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-sm text-primary font-medium">Admin Access</span>
        </div>
      </div>

      {/* Admin Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-20 md:pb-4">
        
        {/* Trading Settings Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Trading Settings
            </CardTitle>
            <CardDescription>
              Configure trading behavior and preferences for admin operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Skipping token approval bypasses security checks. Only enable this for trusted operations where you understand the risks.
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="skip-approval" className="text-base">
                  Skip Token Approval
                </Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, you can place orders directly without approving tokens first. This only affects wallet address: 0xcc56...634d
                </p>
              </div>
              <Switch
                id="skip-approval"
                checked={settings.skip_approval}
                onCheckedChange={updateSkipApproval}
                disabled={settingsLoading || updating}
              />
            </div>
          </CardContent>
        </Card>

        {/* Test Email Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email System Testing
            </CardTitle>
            <CardDescription>
              Test and verify email notification functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmailTestPanel />
          </CardContent>
        </Card>

        {/* Security Dashboard Section */}
        <SecurityDashboard />

        {/* Future Admin Sections Placeholder */}
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle>More Admin Tools</CardTitle>
            <CardDescription>
              Additional administrative functions will be added here in the future
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              More admin tools coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>;
}