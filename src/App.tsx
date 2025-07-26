import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Contacts from "./pages/Contacts";
import PublicChats from "./pages/PublicChats";
import PublicUsers from "./pages/PublicUsers";
import Settings from "./pages/Settings";
import CreateTrade from "./pages/CreateTrade";
import { BottomTabs } from "./components/navigation/BottomTabs";
import { Header } from "./components/navigation/Header";
import { AuthProvider } from "./hooks/useAuth";
import { AppKitProvider } from "./components/providers/AppKitProvider";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppKitProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="relative">
              <Header />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
                <Route path="/public-chats" element={<ProtectedRoute><PublicChats /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><PublicUsers /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/create-trade" element={<ProtectedRoute><CreateTrade /></ProtectedRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <BottomTabs />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </AppKitProvider>
  </QueryClientProvider>
);

export default App;
