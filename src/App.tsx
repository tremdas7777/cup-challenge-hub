import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import QuizHome from "./pages/QuizHome";
import Checkout from "./pages/Checkout";
import AdminPanel from "./pages/AdminPanel";
import ThankYou from "./pages/ThankYou";
import NotFound from "./pages/NotFound";
import SafePage from "./pages/SafePage";
import { injectPixels } from "./lib/pixelManager";
import { useCloaker } from "./hooks/useCloaker";
import { useUtmifyAutoNotify } from "./hooks/useUtmifyAutoNotify";

const queryClient = new QueryClient();

const CloakedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isBot, loading } = useCloaker();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f4' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #ccc', borderTop: '4px solid #009B3A', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isBot) {
    return <SafePage />;
  }

  return <>{children}</>;
};

const App = () => {
  useEffect(() => {
    injectPixels();
  }, []);

  // Global Utmify auto-notify: fires "venda pendente" on every new order
  // and "venda aprovada" whenever an order is updated to status=paid.
  // Works for ALL gateways (Pagou.ai, CenturionPay, IronPay, ...) and methods (PIX/cartão).
  useUtmifyAutoNotify();

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CloakedRoute><QuizHome /></CloakedRoute>} />
          <Route path="/checkout" element={<CloakedRoute><Checkout /></CloakedRoute>} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/obrigado" element={<ThankYou />} />
          <Route path="/safe" element={<SafePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
