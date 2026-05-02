import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, Lock, CreditCard, Apple, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import esnLogo from '@/assets/esn-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { fetchPaymentGatewayConfig } from '@/lib/paymentGateway';
import { fireConversionEvent } from '@/lib/pixelManager';
import { trackEvent } from '@/lib/funnelTracking';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements, ExpressCheckoutElement } from '@stripe/react-stripe-js';
import { sendUtmifySale } from '@/lib/utmifyManager';

const STORAGE_KEY = 'esn_checkout_buyer';

interface CheckoutBuyer {
  nome: string;
  email: string;
  telefone: string;
  cep: string;
  endereco: string;
  numero: string;
  cidade: string;
  estado: string;
  shippingCost?: number;
  shippingMethod?: string;
}

function PaymentForm({ totalAmount, buyer, isAddressValid, orderId }: { totalAmount: number; buyer: CheckoutBuyer; isAddressValid: boolean; orderId: string | null }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onConfirm = async () => {
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    // Persist buyer data for upsell flow
    sessionStorage.setItem('upsell_buyer', JSON.stringify(buyer));

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/obrigado`,
        receipt_email: buyer.email,
        payment_method_data: {
          billing_details: {
            name: buyer.nome,
            email: buyer.email,
            phone: buyer.telefone,
            address: {
              line1: `${buyer.endereco || ''} ${buyer.numero || ''}`.trim(),
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
      setError(stripeError.message || 'Zahlungsfehler. Bitte erneut versuchen.');
      setLoading(false);
      trackEvent('payment_error');
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Save payment method for 1-click upsell
      if (typeof paymentIntent.payment_method === 'string') {
        sessionStorage.setItem('stripe_payment_method_id', paymentIntent.payment_method);
      }

      // Update order status in database
      if (orderId) {
        try {
          await supabase.from('orders').update({ status: 'paid' }).eq('id', orderId);
        } catch (err) {
          console.error('Failed to update order status:', err);
        }
      }

      // Notify Utmify immediately
      await sendUtmifySale({
        orderId: orderId || `st_${Date.now()}`,
        customerName: buyer.nome,
        customerEmail: buyer.email,
        customerPhone: buyer.telefone,
        productName: 'ESN Premium Bundle + Supplement Guide',
        priceInCents: Math.round(totalAmount * 100),
      });

      trackEvent('purchase');
      fireConversionEvent('Purchase', { value: totalAmount, currency: 'EUR' });
      navigate('/obrigado');
    } else {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Express Checkout (Apple Pay, Google Pay, Link) */}
      <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-3 text-center">Schnell bezahlen mit</p>
        <ExpressCheckoutElement onConfirm={onConfirm} />
      </div>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-muted-foreground/20"></span>
        </div>
        <div className="relative flex justify-center text-[10px] uppercase font-bold">
          <span className="bg-background px-2 text-muted-foreground">Oder com Karte</span>
        </div>
      </div>

      <div className="bg-muted/30 rounded-lg p-4 border border-border">
        <PaymentElement options={{ layout: 'accordion' }} />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-bold text-center border border-destructive/30">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full h-16 bg-centauro-green hover:bg-centauro-green/90 text-primary-foreground font-black text-lg rounded-xl shadow-xl transition-all hover:scale-[1.01] active:scale-95 group"
        style={{ boxShadow: '0 8px 30px hsl(145 63% 42% / 0.3)' }}
      >
        {loading ? (
          <><Loader2 size={20} className="mr-2 animate-spin" /> BITTE WARTEN...</>
        ) : (
          <span className="flex items-center gap-2">
            JETZT BEZAHLEN — €{totalAmount.toFixed(2).replace('.', ',')}
          </span>
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-muted-foreground pt-1">
        <ShieldCheck size={12} />
        <span className="text-[10px] uppercase tracking-wider font-bold">
          256-Bit SSL · Stripe Verified
        </span>
      </div>
    </form>
  );
}

export default function Pagamento() {
  const navigate = useNavigate();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [buyer, setBuyer] = useState<CheckoutBuyer | null>(null);
  const [amount, setAmount] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.style.backgroundColor = '#212121';
    document.body.style.backgroundColor = '#212121';
    window.scrollTo(0, 0);

    const initPaymentIntent = async () => {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) {
          navigate('/checkout');
          return;
        }
        const buyerData: CheckoutBuyer = JSON.parse(raw);
        setBuyer(buyerData);

        // Reuse existing session data if available to avoid duplicate orders
        const savedOrderId = sessionStorage.getItem('stripe_order_id');
        const savedClientSecret = sessionStorage.getItem('stripe_client_secret');
        
        const cfg = await fetchPaymentGatewayConfig();
        if (!cfg.stripe?.publicKey || !cfg.stripe?.secretKey) {
          setError('Zahlungsgateway nicht konfiguriert.');
          setLoading(false);
          return;
        }

        const totalAmount = buyerData.shippingCost || (cfg.productTicketCents / 100);
        setAmount(totalAmount);
        setStripePromise(loadStripe(cfg.stripe.publicKey));

        if (savedOrderId && savedClientSecret) {
          setOrderId(savedOrderId);
          setClientSecret(savedClientSecret);
          setLoading(false);
          return;
        }

        const { data, error: fnErr } = await supabase.functions.invoke('criar-payment-intent', {
          body: {
            secretKey: cfg.stripe.secretKey,
            amount: totalAmount,
            buyerName: buyerData.nome || 'Kunde',
            buyerEmail: buyerData.email,
            buyerPhone: buyerData.telefone || '',
            itemsDescription: 'ESN Premium Bundle + Supplement Guide',
            metadata: {
              address: buyerData.endereco || '',
              addressNumber: buyerData.numero || '',
              cep: buyerData.cep || '',
              city: buyerData.cidade || '',
              state: buyerData.estado || '',
              shippingMethod: 'dhl_standard',
              shippingCostCents: String(Math.round(totalAmount * 100)),
            },
          },
        });

        if (fnErr) throw fnErr;
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
          sessionStorage.setItem('stripe_client_secret', data.clientSecret);
          if (data.order_id) {
            setOrderId(data.order_id);
            sessionStorage.setItem('stripe_order_id', data.order_id);
          }
        } else {
          throw new Error('Kein Client Secret erhalten.');
        }
      } catch (e: any) {
        console.error('Error init payment:', e);
        setError(e.message || 'Zahlungsfehler. Bitte erneut versuchen.');
      } finally {
        setLoading(false);
      }
    };

    initPaymentIntent();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary text-primary-foreground gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-centauro-gold" />
        <p className="text-sm font-bold uppercase tracking-wider">Sichere Zahlung wird vorbereitet…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary text-primary-foreground gap-4 p-6 text-center">
        <p className="text-sm font-bold text-destructive">{error}</p>
        <Button onClick={() => navigate('/checkout')} variant="outline">
          Zurück zum Checkout
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Rubik', 'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-primary py-4 px-4 border-b border-white/5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <img src={esnLogo} alt="ESN" className="h-10 md:h-14 object-contain" style={{ mixBlendMode: 'screen' }} />
          <div className="flex items-center gap-2 text-primary-foreground/60">
            <Lock size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Sicherer Checkout</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">Abschluss der Zahlung</h1>
          <p className="text-muted-foreground text-sm">Sichere Bezahlung über Stripe</p>
        </div>

        <Card className="p-0 border-border bg-white shadow-xl overflow-hidden rounded-2xl">
          {/* Order Summary Summary */}
          <div className="bg-muted/30 p-5 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ihre Bestellung</span>
              <span className="px-2 py-1 bg-centauro-green/10 text-centauro-green text-[10px] font-black rounded uppercase">Bereit zum Versand</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-lg border border-border flex items-center justify-center p-2">
                <CheckCircle2 className="text-centauro-green" size={24} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-foreground truncate">ESN Premium Bundle</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">+ Supplement Performance Guide</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-foreground">€{amount.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {clientSecret && stripePromise && buyer ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  locale: 'de',
                  appearance: {
                    theme: 'flat',
                    variables: {
                      colorPrimary: '#FFCC00',
                      colorBackground: '#ffffff',
                      colorText: '#212121',
                      colorDanger: '#dc2626',
                      fontFamily: 'Rubik, Inter, system-ui, sans-serif',
                      borderRadius: '10px',
                      fontSizeBase: '14px',
                      spacingUnit: '4px',
                    },
                    rules: {
                      '.Tab': { border: '2px solid #e5e7eb', boxShadow: 'none' },
                      '.Tab--selected': { borderColor: '#FFCC00', backgroundColor: '#FFFBEB' },
                      '.Input': { border: '2px solid #e5e7eb', boxShadow: 'none', padding: '12px' },
                      '.Input:focus': { borderColor: '#FFCC00', boxShadow: '0 0 0 3px rgba(255, 204, 0, 0.2)' },
                      '.Label': { fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' },
                    }
                  },
                }}
              >
                <PaymentForm 
                  totalAmount={amount} 
                  buyer={buyer} 
                  isAddressValid={true}
                  orderId={orderId}
                />
              </Elements>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-centauro-green" />
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Sichere Verbindung...</p>
              </div>
            )}
          </div>
        </Card>

        {/* Security Info */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex items-center gap-6 opacity-40 grayscale hover:grayscale-0 transition-all">
            <CreditCard size={24} />
            <Apple size={24} />
            <ShieldCheck size={24} />
          </div>
          <p className="text-[10px] text-muted-foreground text-center max-w-xs leading-relaxed">
            Ihre Zahlungsinformationen werden verschlüsselt verarbeitet. Wir speichern keine vollständigen Kartendaten auf nossos Servern.
          </p>
        </div>
      </div>
    </div>
  );
}
