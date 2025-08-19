import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Mail, Settings, AlertTriangle, Palette, Wrench } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmailTestPanel } from "@/components/debug/EmailTestPanel";
import { SecurityDashboard } from "@/components/security/SecurityDashboard";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BetaManagement } from "@/components/admin/BetaManagement";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
// Define admin sections
const sections = [
  {
    id: 'trading-settings',
    title: 'Trading Settings',
    description: 'Configure trading behavior and preferences',
    icon: Settings,
  },
  {
    id: 'beta-management',
    title: 'Beta Management',
    description: 'Control beta phase access and manage users',
    icon: ShieldCheck,
  },
  {
    id: 'email-testing',
    title: 'Email Testing',
    description: 'Test and verify email functionality',
    icon: Mail,
  },
  {
    id: 'security-dashboard',
    title: 'Security Dashboard',
    description: 'Monitor security metrics and alerts',
    icon: ShieldCheck,
  },
  {
    id: 'theme-settings',
    title: 'Theme Settings',
    description: 'Customize application appearance',
    icon: Palette,
  },
  {
    id: 'future-tools',
    title: 'Future Tools',
    description: 'Additional admin functions',
    icon: Wrench,
  },
];

export default function Underground() {
  const [activeSection, setActiveSection] = useState('trading-settings');
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
    return <div className="flex-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>;
  }

  // Only redirect after all loading is complete
  if (!isAuthenticated || !isAdmin) {
    console.log('Underground redirect triggered:', { isAuthenticated, isAdmin });
    return <Navigate to="/" replace />;
  }
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'trading-settings':
        return (
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
        );

      case 'beta-management':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Beta Phase Management
              </CardTitle>
              <CardDescription>
                Control beta phase access and manage beta users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BetaManagement />
            </CardContent>
          </Card>
        );

      case 'email-testing':
        return (
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
        );

      case 'security-dashboard':
        return <SecurityDashboard />;

      case 'theme-settings':
        return <ThemeSwitcher />;

      case 'future-tools':
        return (
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
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Admin Sections</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <SidebarMenuItem key={section.id}>
                        <SidebarMenuButton
                          onClick={() => setActiveSection(section.id)}
                          className={activeSection === section.id ? "bg-primary/10 text-primary" : ""}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{section.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          {/* Header */}
          <div className="border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 pb-20 md:pb-4">
            {renderSectionContent()}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}