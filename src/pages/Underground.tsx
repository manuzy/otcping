import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Mail, Loader2 } from "lucide-react";
import { EmailTestPanel } from "@/components/debug/EmailTestPanel";
export default function Underground() {
  const {
    isAdmin
  } = useIsAdmin();
  const {
    isAuthenticated,
    user
  } = useWalletAuth();

  // Show loading while auth state is being determined
  if (user === undefined) {
    return <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
  }

  // Redirect if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
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