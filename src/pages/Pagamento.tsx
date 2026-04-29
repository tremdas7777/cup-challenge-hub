import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Loader2, Lock, ShieldCheck, CheckCircle, ArrowLeft, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { fetchPaymentGatewayConfig } from '@/lib/paymentGateway';
import { fireConversionEvent } from '@/lib/pixelManager';
import { trackEvent } from '@/lib/funnelTracking';
import esnLogo from '@/assets/esn-logo.png';
import comboPackImg from '@/assets/esn-combo-pack.jpg';

interface CheckoutBuyer {
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
  shippingMethod?: string;
  shippingCost?: number;
}

const STORAGE_KEY = 'esn_checkout_buyer';

function PaymentForm({ buyer, amount }: { buyer: CheckoutBuyer; amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    // Save buyer for upsell page
    sessionStorage.setItem('upsell_buyer', JSON.stringify({
      nome: buyer.nome,
      email: buyer.email,
      telefone: buyer.telefone,
      cep: buyer.cep,
      endereco: buyer.endereco,
      numero: buyer.numero,
      complemento: buyer.complemento,
      bairro: buyer.bairro,
      cidade: buyer.cidade,
      estado: buyer.estado,
    }));

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
              line2: buyer.complemento || undefined,
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
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      trackEvent('purchase');
      fireConversionEvent('Purchase', { value: amount, currency: 'EUR' });
      navigate('/obrigado');
    } else {
      // Stripe handled redirect (3DS, Klarna, etc.)
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white rounded-xl p-4 border-2 border-primary/10">
        <PaymentElement
          options={{
            layout: 'accordion' as const,
          }}
        />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium rounded-lg p-3">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full h-14 text-base font-black uppercase tracking-wider bg-centauro-gold hover:bg-centauro-gold/90 text-primary rounded-xl shadow-lg"
      >
        {loading ? (
          <><Loader2 size={18} className="mr-2 animate-spin" /> WIRD VERARBEITET…</>
        ) : (
          <><Lock size={16} className="mr-2" /> JETZT SICHER BEZAHLEN — €{amount.toFixed(2).replace('.', ',')}</>
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
  const [buyer, setBuyer] = useState<CheckoutBuyer | null>(null);
  const [amount, setAmount] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.style.backgroundColor = '#212121';
    document.body.style.backgroundColor = '#212121';
    window.scrollTo(0, 0);

    const init = async () => {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) {
          navigate('/checkout');
          return;
        }
        const buyerData: CheckoutBuyer = JSON.parse(raw);
        setBuyer(buyerData);

        const cfg = await fetchPaymentGatewayConfig();
        if (!cfg.stripe?.publicKey || !cfg.stripe?.secretKey) {
          setError('Stripe nicht konfiguriert.');
          setLoading(false);
          return;
        }

        const totalAmount = buyerData.shippingCost || (cfg.productTicketCents / 100);
        setAmount(totalAmount);

        setStripePromise(loadStripe(cfg.stripe.publicKey));

        const { data, error: fnErr } = await supabase.functions.invoke('criar-payment-intent', {
          body: {
            secretKey: cfg.stripe.secretKey,
            amount: totalAmount,
            buyerName: buyerData.nome,
            buyerEmail: buyerData.email,
            buyerPhone: buyerData.telefone,
            itemsDescription: 'nutrition supplements guide eBook',
            metadata: {
              address: buyerData.endereco || '',
              addressNumber: buyerData.numero || '',
              complement: buyerData.complemento || '',
              neighborhood: buyerData.bairro || '',
              city: buyerData.cidade || '',
              state: buyerData.estado || '',
              cep: buyerData.cep || '',
              shippingMethod: buyerData.shippingMethod || 'sedex',
              shippingCostCents: String(Math.round(totalAmount * 100)),
            },
          },
        });

        if (fnErr) throw fnErr;
        if (!data?.clientSecret) throw new Error('Konnte Zahlung nicht initialisieren.');

        setClientSecret(data.clientSecret);
        setLoading(false);
      } catch (e: any) {
        console.error('Pagamento init error:', e);
        setError(e?.message || 'Fehler beim Laden der Zahlung.');
        setLoading(false);
      }
    };

    init();
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
      {/* ESN Header */}
      <div className="bg-primary py-4 px-4 sticky top-0 z-20 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/checkout')} className="text-primary-foreground/70 hover:text-primary-foreground flex items-center gap-1 text-xs">
            <ArrowLeft size={14} /> Zurück
          </button>
          <img src={esnLogo} alt="ESN" className="h-12 md:h-16 object-contain" style={{ mixBlendMode: 'screen' }} />
          <div className="flex items-center gap-1 text-primary-foreground/80 text-[10px] font-bold uppercase">
            <Lock size={10} /> Sicher
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">
            Bezahlung abschließen
          </h1>
          <p className="text-xs text-muted-foreground">
            Schritt 3 von 3 · Wähle deine bevorzugte Zahlungsart
          </p>
        </div>

        {/* Order summary */}
        <Card className="p-4 border-2 border-primary/10 bg-gradient-to-br from-card to-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center p-1 border border-border">
              <img src={comboPackImg} alt="ESN Combo Pack" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-centauro-gold font-bold">Dein Paket</p>
              <p className="text-sm font-black text-foreground truncate">ESN Premium Bundle</p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                <Truck size={10} /> Versand inklusive
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Gesamt</p>
              <p className="text-xl font-black text-centauro-green">
                €{amount.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
        </Card>

        {/* Buyer info preview */}
        {buyer && (
          <Card className="p-3 border border-border bg-card">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[11px] space-y-0.5 flex-1 min-w-0">
                <p className="font-black text-foreground truncate">{buyer.nome}</p>
                <p className="text-muted-foreground truncate">{buyer.email}</p>
                {buyer.endereco && (
                  <p className="text-muted-foreground truncate">
                    {buyer.endereco}, {buyer.numero} · {buyer.cidade} {buyer.cep}
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate('/checkout')}
                className="text-[10px] text-centauro-gold font-bold uppercase tracking-wider hover:underline whitespace-nowrap"
              >
                Ändern
              </button>
            </div>
          </Card>
        )}

        {/* Payment Form */}
        {clientSecret && stripePromise && buyer && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
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
                  '.Tab': {
                    border: '2px solid #e5e7eb',
                    boxShadow: 'none',
                  },
                  '.Tab--selected': {
                    borderColor: '#FFCC00',
                    backgroundColor: '#FFFBEB',
                  },
                  '.Input': {
                    border: '2px solid #e5e7eb',
                    boxShadow: 'none',
                    padding: '12px',
                  },
                  '.Input:focus': {
                    borderColor: '#FFCC00',
                    boxShadow: '0 0 0 3px rgba(255, 204, 0, 0.2)',
                  },
                  '.Label': {
                    fontWeight: '700',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  },
                },
              },
            }}
          >
            <PaymentForm buyer={buyer} amount={amount} />
          </Elements>
        )}

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="flex flex-col items-center gap-1 p-2 bg-muted/30 rounded-lg">
            <ShieldCheck size={16} className="text-centauro-green" />
            <span className="text-[9px] font-bold uppercase text-center">SSL Geschützt</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 bg-muted/30 rounded-lg">
            <CheckCircle size={16} className="text-centauro-green" />
            <span className="text-[9px] font-bold uppercase text-center">Geld-zurück</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 bg-muted/30 rounded-lg">
            <Lock size={16} className="text-centauro-green" />
            <span className="text-[9px] font-bold uppercase text-center">Stripe Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
