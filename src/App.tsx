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


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="relative">
          <Header />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/public-chats" element={<PublicChats />} />
            <Route path="/users" element={<PublicUsers />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/create-trade" element={<CreateTrade />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomTabs />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
