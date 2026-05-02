import { useEffect, useRef, useState, useMemo } from 'react';
import { Loader2, CheckCircle, Sparkles, ShieldCheck, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { fetchPaymentGatewayConfig } from '@/lib/paymentGateway';
import { fireConversionEvent } from '@/lib/pixelManager';
import esnProductImg from '@/assets/esn-creatine.png';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

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

const UPSELL_AMOUNT = 4.00;
const UPSELL_DESCRIPTION = 'ESN Ultrapure Creatine Monohydrate (Special Limited Offer)';

type Stage = 'offer' | 'processing' | 'card_form';

export default function UpsellPopup({ open, onOpenChange, onPaid, buyer }: UpsellPopupProps) {
  const [stage, setStage] = useState<Stage>('offer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const hasFiredView = useRef(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStage('offer');
      setError('');
      setClientSecret('');
      if (!hasFiredView.current) {
        fireConversionEvent('upsell_view');
        hasFiredView.current = true;
      }
    } else {
      hasFiredView.current = false;
    }
  }, [open]);

  // 1-click attempt; falls back to card form if no payment method available
  const handlePurchase = async () => {
    setLoading(true);
    setError('');
    const paymentMethodId = sessionStorage.getItem('stripe_payment_method_id');

    try {
      const gatewayConfig = await fetchPaymentGatewayConfig();
      if (!gatewayConfig.stripe?.secretKey || !gatewayConfig.stripe?.publicKey) {
        throw new Error('Stripe configuration missing');
      }

      // No payment method saved → show card form fallback
      if (!paymentMethodId) {
        await openCardFormFallback(gatewayConfig);
        return;
      }

      // Try 1-click charge
      setStage('processing');
      const { data, error: invokeError } = await supabase.functions.invoke('criar-payment-intent', {
        body: {
          secretKey: gatewayConfig.stripe.secretKey,
          amount: UPSELL_AMOUNT,
          buyerName: buyer.nome,
          buyerEmail: buyer.email,
          buyerPhone: buyer.telefone,
          itemsDescription: UPSELL_DESCRIPTION,
          paymentMethodId,
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
        sessionStorage.setItem('upsell_completed', '1');
        fireConversionEvent('upsell_accepted');
        window.location.href = '/obrigado-final?upsell=success';
        return;
      }

      // 1-click failed → fallback to card form
      console.warn('1-click upsell failed, falling back to card form:', data?.error);
      await openCardFormFallback(gatewayConfig);
    } catch (err: any) {
      console.error('Upsell error:', err);
      // Try fallback if 1-click attempt errored
      try {
        const gatewayConfig = await fetchPaymentGatewayConfig();
        await openCardFormFallback(gatewayConfig);
      } catch {
        setError('Fehler bei der Zahlung. Bitte erneut versuchen.');
        setStage('offer');
        setLoading(false);
      }
    }
  };

  const openCardFormFallback = async (gatewayConfig: any) => {
    setStage('processing');
    // Create a PaymentIntent without payment_method to get a client_secret for Elements
    const { data, error: invokeError } = await supabase.functions.invoke('criar-payment-intent', {
      body: {
        secretKey: gatewayConfig.stripe.secretKey,
        amount: UPSELL_AMOUNT,
        buyerName: buyer.nome,
        buyerEmail: buyer.email,
        buyerPhone: buyer.telefone,
        itemsDescription: UPSELL_DESCRIPTION,
        metadata: {
          upsell: 'true',
          product: UPSELL_DESCRIPTION,
        },
      },
    });

    if (invokeError || !data?.client_secret) {
      throw new Error(data?.error || 'Konnte Zahlung nicht initialisieren');
    }

    setClientSecret(data.client_secret);
    setStripePromise(loadStripe(gatewayConfig.stripe.publicKey));
    setStage('card_form');
    setLoading(false);
  };

  const handleDecline = () => {
    fireConversionEvent('upsell_declined');
    sessionStorage.setItem('upsell_completed', '1');
    window.location.href = '/obrigado-final';
  };

  const handleCardPaid = (paymentMethodId?: string) => {
    if (paymentMethodId) {
      sessionStorage.setItem('stripe_payment_method_id', paymentMethodId);
    }
    sessionStorage.setItem('upsell_completed', '1');
    fireConversionEvent('upsell_accepted');
    window.location.href = '/obrigado-final?upsell=success';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDecline(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md mx-auto rounded-2xl p-0 overflow-hidden">
        {stage === 'offer' && (
          <div className="bg-background">
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
              <div className="relative w-full aspect-square bg-white rounded-xl flex items-center justify-center p-6 border-2 border-primary/5 shadow-inner">
                <img src={esnProductImg} alt="ESN Product" className="max-w-full max-h-full object-contain drop-shadow-xl" style={{ mixBlendMode: 'multiply' }} />
                <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm animate-pulse">
                  NUR JETZT!
                </div>
              </div>

              <div className="text-center space-y-1">
                <p className="text-[11px] text-muted-foreground line-through">Statt €29,90</p>
                <p className="text-3xl font-black text-centauro-green">
                  €4<span className="text-xl">,00</span>
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  Einmaliges Angebot • Inklusive Versand
                </p>
              </div>

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
                  <span>Sichere Zahlung mit Karte</span>
                </li>
              </ul>

              {error && (
                <p className="text-xs text-destructive text-center font-medium">{error}</p>
              )}

              <div className="space-y-2 pt-1">
                <Button
                  onClick={handlePurchase}
                  disabled={loading}
                  className="w-full h-12 text-sm font-black uppercase tracking-wider bg-centauro-green hover:bg-centauro-green/90 text-primary-foreground rounded-xl shadow-lg"
                >
                  {loading ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> WIRD VERARBEITET...</>
                  ) : (
                    <>Ja, für €4,00 hinzufügen</>
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
            <p className="text-xs text-muted-foreground">Wir bereiten deine Zahlung vor.</p>
          </div>
        )}

        {stage === 'card_form' && clientSecret && stripePromise && (
          <div className="bg-background">
            <DialogHeader className="px-5 pt-5 pb-2">
              <DialogTitle className="text-lg font-black uppercase leading-tight flex items-center gap-2">
                <CreditCard size={18} className="text-centauro-green" />
                Karte bestätigen
              </DialogTitle>
              <DialogDescription className="text-xs">
                Gib deine Kartendaten ein, um die Creatine für €4,00 hinzuzufügen.
              </DialogDescription>
            </DialogHeader>
            <div className="px-5 pb-5">
              <Elements
                stripe={stripePromise}
                options={{ clientSecret, appearance: { theme: 'stripe' } }}
              >
                <UpsellCardForm
                  buyer={buyer}
                  onPaid={handleCardPaid}
                  onCancel={handleDecline}
                />
              </Elements>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UpsellCardForm({
  buyer,
  onPaid,
  onCancel,
}: {
  buyer: UpsellBuyer;
  onPaid: (paymentMethodId?: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/obrigado-final?upsell_success=1`,
        receipt_email: buyer.email,
        payment_method_data: {
          billing_details: {
            name: buyer.nome,
            email: buyer.email,
            phone: buyer.telefone,
            address: {
              line1: `${buyer.endereco || ''} ${buyer.numero || ''}`.trim() || undefined,
              city: buyer.cidade || undefined,
              state: buyer.estado || undefined,
              postal_code: buyer.cep || undefined,
              country: 'DE',
            },
          },
        },
      },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message || 'Zahlungsfehler');
      setLoading(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Update order status (webhook will also do this, but we want immediate UX)
      if (paymentIntent.id) {
        try {
          await supabase
            .from('orders')
            .update({ status: 'paid' })
            .eq('external_id', paymentIntent.id);
        } catch (err) {
          console.error('Failed to update upsell order:', err);
        }
      }
      const pmId = typeof paymentIntent.payment_method === 'string'
        ? paymentIntent.payment_method
        : undefined;
      onPaid(pmId);
    } else {
      setError('Zahlung konnte nicht abgeschlossen werden.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-muted/30 rounded-lg p-3 border border-border">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {error && (
        <p className="text-xs text-destructive text-center font-medium">{error}</p>
      )}

      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full h-12 text-sm font-black uppercase tracking-wider bg-centauro-green hover:bg-centauro-green/90 text-primary-foreground rounded-xl shadow-lg"
      >
        {loading ? (
          <><Loader2 size={16} className="mr-2 animate-spin" /> WIRD VERARBEITET...</>
        ) : (
          <>Bezahlen — €4,00</>
        )}
      </Button>
      <button
        type="button"
        onClick={onCancel}
        className="w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5 underline-offset-2 hover:underline"
      >
        Nein danke. Weiter zu meiner Bestellung
      </button>

      <div className="flex items-center justify-center gap-1.5 text-muted-foreground pt-1">
        <ShieldCheck size={11} />
        <span className="text-[10px] uppercase tracking-wider">100% sicherer Kauf</span>
      </div>
    </form>
  );
}
