import { useEffect, useState } from 'react';
import { CheckCircle, Package, Truck, Gift, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import esnLogo from '@/assets/esn-logo.png';
import UpsellPopup from '@/components/UpsellPopup';
import { fireConversionEvent } from '@/lib/pixelManager';
import { trackEvent } from '@/lib/funnelTracking';

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

const UPSELL_FLAG_KEY = 'upsell_completed';

export default function ThankYou() {
  const [showConfetti, setShowConfetti] = useState(true);
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellDone, setUpsellDone] = useState(false);
  const [buyer, setBuyer] = useState<UpsellBuyer | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#212121');
    document.documentElement.style.backgroundColor = '#212121';
    document.body.style.backgroundColor = '#212121';

    // Track purchase event if not already tracked
    const purchaseTracked = sessionStorage.getItem('purchase_tracked') === '1';
    
    let parsed: UpsellBuyer | null = null;
    try {
      const raw = sessionStorage.getItem('upsell_buyer');
      if (raw) parsed = JSON.parse(raw);
    } catch {}

    if (!purchaseTracked) {
      fireConversionEvent('Purchase', { value: 12.00, currency: 'EUR' }, undefined, {
        email: parsed?.email,
        phone: parsed?.telefone,
        firstName: parsed?.nome?.split(' ')[0],
        lastName: parsed?.nome?.split(' ').slice(1).join(' '),
        zip: parsed?.cep,
        city: parsed?.cidade,
        state: parsed?.estado
      });
      trackEvent('sale_completed');
      sessionStorage.setItem('purchase_tracked', '1');
    }

    const timer = setTimeout(() => setShowConfetti(false), 4000);

    // Decide whether to show upsell
    const alreadyDone = sessionStorage.getItem(UPSELL_FLAG_KEY) === '1';
    if (alreadyDone) {
      setUpsellDone(true);
      return () => clearTimeout(timer);
    }
    // Fallback for preview/testing
    if (!parsed) {
      parsed = {
        nome: 'Testkunde',
        email: 'kunde@test.de',
        telefone: '+490000000',
      };
    }

    setBuyer(parsed);

    // Show upsell after a brief delay
    const upsellTimer = setTimeout(() => {
      if (!alreadyDone) setShowUpsell(true);
    }, 500);

    return () => {
      clearTimeout(timer);
      clearTimeout(upsellTimer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Rubik', 'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-primary py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <img src={esnLogo} alt="ESN" className="h-14 md:h-20 object-contain" style={{ mixBlendMode: 'screen' }} />
        </div>
      </div>

      {/* Success Banner */}
      <div className="bg-centauro-green py-3 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-2 text-primary-foreground">
          <ShieldCheck size={20} />
          <span className="text-sm font-bold tracking-wide uppercase">
            Bestellung abgeschlossen
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Success Icon */}
        <div className="flex flex-col items-center mb-8 relative">
          {showConfetti && (
            <div className="absolute -top-4 left-0 right-0 flex justify-center pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full absolute animate-bounce"
                  style={{
                    backgroundColor: ['#FF8C00', '#FFD700', '#00A651', '#FFFFFF', '#1A1A1A'][i % 5],
                    left: `${15 + (i * 6)}%`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: `${0.8 + (i * 0.1)}s`,
                  }}
                />
              ))}
            </div>
          )}
          <div className="w-20 h-20 rounded-full bg-centauro-green/10 flex items-center justify-center mb-4 ring-4 ring-centauro-green/20">
            <CheckCircle className="text-centauro-green" size={48} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-foreground text-center uppercase tracking-tight">
            Vielen Dank für deinen Kauf!
          </h1>
          <p className="text-muted-foreground text-center mt-2 text-sm leading-relaxed max-w-xs">
            Deine Bestellung wurde bestätigt. Du erhältst die Details per E-Mail.
          </p>
        </div>

        {/* Order Steps */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4 bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-centauro-green/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="text-centauro-green" size={22} />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Zahlung bestätigt</p>
              <p className="text-muted-foreground text-xs mt-0.5">Der Betrag wurde bestätigt und deine Bestellung wird bearbeitet.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Package className="text-primary" size={22} />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Bestellung wird vorbereitet</p>
              <p className="text-muted-foreground text-xs mt-0.5">Die Artikel werden für den Versand zusammengestellt.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-centauro-gold/10 flex items-center justify-center flex-shrink-0">
              <Truck className="text-centauro-gold" size={22} />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Versand per DHL/DPD</p>
              <p className="text-muted-foreground text-xs mt-0.5">Der Tracking-Code wird dir per E-Mail zugesendet.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-centauro-green/10 flex items-center justify-center flex-shrink-0">
              <Gift className="text-centauro-green" size={22} />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Verlosung inklusive!</p>
              <p className="text-muted-foreground text-xs mt-0.5">Deine Teilnahme an der Premium Supplement-Paket Verlosung ist bestätigt.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          {window.location.search.includes('upsell_success=1') && (
            <div className="bg-centauro-green/10 border border-centauro-green p-3 rounded-lg mb-2 text-center">
              <p className="text-xs font-bold text-centauro-green">✓ Creatine wurde erfolgreich hinzugefügt!</p>
            </div>
          )}
          <Button
            className="w-full h-14 text-base font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg"
            onClick={() => window.location.href = 'https://www.esn.com/'}
          >
            <ArrowRight size={18} className="mr-2" />
            ZUM OFFIZIELLEN SHOP
          </Button>
        </div>

        {/* Security Footer */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-3">
            <ShieldCheck size={14} />
            <span className="text-[11px] font-medium uppercase tracking-wider">100% sicherer Kauf</span>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/70 leading-relaxed">
            Dies ist uma offizielle ESN Aktion. 
            Alle deine Daten sind mit Ende-zu-Ende-Verschlüsselung geschützt.
          </p>
        </div>

        {buyer && (
          <UpsellPopup
            open={showUpsell}
            onOpenChange={setShowUpsell}
            onPaid={() => {
              setUpsellDone(true);
              sessionStorage.setItem(UPSELL_FLAG_KEY, '1');
            }}
            buyer={buyer}
          />
        )}
    </div>
    </div>
  );
}
