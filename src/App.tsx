import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AppPage from "./pages/App";
import NotFound from "./pages/NotFound";
import Contacts from "./pages/Contacts";
import PublicTrades from "./pages/PublicTrades";
import PublicUsers from "./pages/PublicUsers";
import Settings from "./pages/Settings";
import CreateTrade from "./pages/CreateTrade";
import Underground from "./pages/Underground";
import { LandingLayout } from "./components/layout/LandingLayout";
import { AppLayout } from "./components/layout/AppLayout";
import { LegacyRedirect } from "./components/routing/LegacyRedirect";
import { AuthProvider } from "./hooks/useAuth";
import { AppKitProvider } from "./components/providers/AppKitProvider";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppKitProvider>
      <AuthProvider>
        <TooltipProvider delayDuration={300}>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Landing page */}
              <Route path="/" element={
                <LandingLayout>
                  <Index />
                </LandingLayout>
              } />
              
              {/* Protected app routes */}
              <Route path="/app/dashboard" element={
                <ProtectedRoute>
                  <AppLayout>
                    <AppPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/app/trades" element={
                <ProtectedRoute>
                  <AppLayout>
                    <PublicTrades />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/app/traders" element={
                <ProtectedRoute>
                  <AppLayout>
                    <PublicUsers />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/app/contacts" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Contacts />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/app/settings" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/app/create-trade" element={
                <ProtectedRoute>
                  <AppLayout>
                    <CreateTrade />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/underground" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Underground />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Legacy redirects */}
              <Route path="/app" element={
                <LegacyRedirect to="/app/dashboard">
                  <ProtectedRoute><AppPage /></ProtectedRoute>
                </LegacyRedirect>
              } />
              <Route path="/public-trades" element={
                <LegacyRedirect to="/app/trades">
                  <ProtectedRoute><PublicTrades /></ProtectedRoute>
                </LegacyRedirect>
              } />
              <Route path="/users" element={
                <LegacyRedirect to="/app/traders">
                  <ProtectedRoute><PublicUsers /></ProtectedRoute>
                </LegacyRedirect>
              } />
              <Route path="/contacts" element={
                <LegacyRedirect to="/app/contacts">
                  <ProtectedRoute><Contacts /></ProtectedRoute>
                </LegacyRedirect>
              } />
              <Route path="/settings" element={
                <LegacyRedirect to="/app/settings">
                  <ProtectedRoute><Settings /></ProtectedRoute>
                </LegacyRedirect>
              } />
              <Route path="/create-trade" element={
                <LegacyRedirect to="/app/create-trade">
                  <ProtectedRoute><CreateTrade /></ProtectedRoute>
                </LegacyRedirect>
              } />
              
              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </AppKitProvider>
  </QueryClientProvider>
);

export default App;
