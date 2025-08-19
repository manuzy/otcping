import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import AppPage from "./pages/App";
import NotFound from "./pages/NotFound";
import Contacts from "./pages/Contacts";
import PublicTrades from "./pages/PublicTrades";
import PublicUsers from "./pages/PublicUsers";
import Settings from "./pages/Settings";
import InstitutionalProfile from "./pages/InstitutionalProfile";
import CreateTrade from "./pages/CreateTrade";
import Underground from "./pages/Underground";
import { BottomTabs } from "./components/navigation/BottomTabs";
import { Header } from "./components/navigation/Header";
import { AuthProvider } from "./hooks/useAuth";
import { AppKitProvider } from "./components/providers/AppKitProvider";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { GlobalSearchProvider } from "./components/search/GlobalSearchProvider";
import { BetaGate } from "./components/beta/BetaGate";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppKitProvider>
      <AuthProvider>
        <BetaGate>
          <GlobalSearchProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            themes={["light", "dark", "blue", "green"]}
            disableTransitionOnChange
          >
            <TooltipProvider delayDuration={300}>
              <Toaster />
              <Sonner />
              <BrowserRouter>
            <div className="relative">
              <Header />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/app" element={<ProtectedRoute><AppPage /></ProtectedRoute>} />
                <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
                <Route path="/public-trades" element={<ProtectedRoute><PublicTrades /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><PublicUsers /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/institutional-profile" element={<ProtectedRoute><InstitutionalProfile /></ProtectedRoute>} />
                <Route path="/create-trade" element={<ProtectedRoute><CreateTrade /></ProtectedRoute>} />
                <Route path="/underground" element={<ProtectedRoute><Underground /></ProtectedRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <BottomTabs />
            </div>
          </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
          </GlobalSearchProvider>
        </BetaGate>
      </AuthProvider>
    </AppKitProvider>
  </QueryClientProvider>
);

export default App;
