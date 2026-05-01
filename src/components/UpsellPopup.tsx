import { useEffect, useRef, useState } from 'react';
import { Loader2, Copy, CheckCircle, QrCode, Sparkles, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { fetchPaymentGatewayConfig } from '@/lib/paymentGateway';
import { fireConversionEvent } from '@/lib/pixelManager';
import esnProductImg from '@/assets/esn-creatine.png';

interface UpsellBuyer {
  nome: string;
  email: string;
  telefone: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

interface UpsellPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: () => void;
  buyer: UpsellBuyer;
}

const UPSELL_AMOUNT = 6.00;
const UPSELL_DESCRIPTION = 'ESN Ultrapure Creatine Monohydrate (Special Limited Offer)';

export default function UpsellPopup({ open, onOpenChange, onPaid, buyer }: UpsellPopupProps) {
  const [stage, setStage] = useState<'offer' | 'processing'>('offer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [pixQr, setPixQr] = useState('');
  const [orderId, setOrderId] = useState('');
  const [copied, setCopied] = useState(false);
  const hasFiredPaid = useRef(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStage('offer');
      setError('');
      hasFiredPaid.current = false;
      if (open) {
        fireConversionEvent('upsell_view');
      }
    }
  }, [open]);

  const handlePurchase = async () => {
    setLoading(true);
    setError('');
    setStage('processing');
    try {
      const gatewayConfig = await fetchPaymentGatewayConfig();
      const paymentMethodId = sessionStorage.getItem('stripe_payment_method_id');
      
      if (!gatewayConfig.stripe?.secretKey) {
        throw new Error('Stripe configuration missing');
      }

      // 1-Click Upsell Charge using criar-payment-intent
      const { data, error: invokeError } = await supabase.functions.invoke('criar-payment-intent', {
        body: {
          secretKey: gatewayConfig.stripe.secretKey,
          amount: UPSELL_AMOUNT,
          buyerName: buyer.nome,
          buyerEmail: buyer.email,
          buyerPhone: buyer.telefone,
          itemsDescription: UPSELL_DESCRIPTION,
          paymentMethodId: paymentMethodId || undefined, // This triggers the 1-click charge
          metadata: {
            upsell: 'true',
            product: UPSELL_DESCRIPTION,
            success_url: `${window.location.origin}/obrigado-final?upsell_success=1`,
          },
        },
      });

      if (invokeError) throw invokeError;
      
      if (data?.success) {
        if (data.order_id) {
          try {
            await supabase.from('orders').update({ status: 'paid' }).eq('id', data.order_id);
          } catch (e) {
            console.error('Failed to update upsell order status:', e);
          }
        }
        // Mark as done
        sessionStorage.setItem('upsell_completed', '1');
        fireConversionEvent('upsell_accepted');
        window.location.href = '/obrigado-final?upsell=success';
      } else {
        throw new Error(data?.error || 'Zahlung fehlgeschlagen');
      }
    } catch (err: any) {
      console.error('Upsell error:', err);
      setError('Fehler bei der 1-Klick-Zahlung. Bitte erneut versuchen.');
      setStage('offer');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    fireConversionEvent('upsell_declined');
    sessionStorage.setItem('upsell_completed', '1');
    window.location.href = '/obrigado-final';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDecline(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md mx-auto rounded-2xl p-0 overflow-hidden">
        {stage === 'offer' && (
          <div className="bg-background">
            {/* Top banner */}
            <div className="bg-gradient-to-r from-centauro-gold to-yellow-500 px-4 py-2 flex items-center justify-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                Exklusives Angebot — nur auf dieser Seite
              </span>
            </div>

            <DialogHeader className="px-5 pt-5 pb-2">
              <DialogTitle className="text-lg font-black uppercase leading-tight">
                Sichere dir jetzt die ESN Ultrapure Creatine
              </DialogTitle>
              <DialogDescription className="text-xs">
                Reines Creatine Monohydrat für optimale Performance. Limitiertes Angebot.
              </DialogDescription>
            </DialogHeader>

            <div className="px-5 pb-5 space-y-4">
              {/* Product image */}
              <div className="relative w-full aspect-square bg-white rounded-xl flex items-center justify-center p-6 border-2 border-primary/5 shadow-inner">
                <img src={esnProductImg} alt="ESN Product" className="max-w-full max-h-full object-contain drop-shadow-xl" style={{ mixBlendMode: 'multiply' }} />
                <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm animate-pulse">
                  NUR JETZT!
                </div>
              </div>

              {/* Price block */}
              <div className="text-center space-y-1">
                <p className="text-[11px] text-muted-foreground line-through">Statt €29,90</p>
                <p className="text-3xl font-black text-centauro-green">
                  €6<span className="text-xl">,00</span>
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  Einmaliges Angebot • Inklusive Versand
                </p>
              </div>

              {/* Benefits */}
              <ul className="space-y-1.5 text-xs text-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-centauro-green mt-0.5 flex-shrink-0" />
                  <span>100% Ultrapure Creatine Monohydrat</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-centauro-green mt-0.5 flex-shrink-0" />
                  <span>Gemeinsamer Versand — keine extra Versandkosten</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-centauro-green mt-0.5 flex-shrink-0" />
                  <span>Zahlung mit 1-Klick bestätigen</span>
                </li>
              </ul>

              {error && (
                <p className="text-xs text-destructive text-center font-medium">{error}</p>
              )}

              {/* CTAs */}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={handlePurchase}
                  disabled={loading}
                  className="w-full h-12 text-sm font-black uppercase tracking-wider bg-centauro-green hover:bg-centauro-green/90 text-primary-foreground rounded-xl shadow-lg"
                >
                  {loading ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> WIRD VERARBEITET...</>
                  ) : (
                    <>Ja, für €6,00 hinzufügen</>
                  )}
                </Button>
                <button
                  onClick={handleDecline}
                  className="w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5 underline-offset-2 hover:underline"
                >
                  Nein danke. Weiter zu meiner Bestellung
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-muted-foreground pt-1">
                <ShieldCheck size={11} />
                <span className="text-[10px] uppercase tracking-wider">100% sicherer Kauf</span>
              </div>
            </div>
          </div>
        )}

        {stage === 'processing' && (
          <div className="p-10 bg-background flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-centauro-green" />
            <h3 className="text-lg font-black uppercase">Sichere Verbindung...</h3>
            <p className="text-xs text-muted-foreground">Wir leiten dich zur sicheren Ein-Klick-Zahlung weiter.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
