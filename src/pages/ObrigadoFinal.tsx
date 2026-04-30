import { useEffect, useState } from 'react';
import { CheckCircle, ExternalLink, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import esnLogo from '@/assets/esn-logo.png';
import { fireConversionEvent } from '@/lib/pixelManager';
import { trackEvent } from '@/lib/funnelTracking';

const ESN_URL = 'https://www.esn.com/';
const REDIRECT_SECONDS = 8;

export default function ObrigadoFinal() {
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    document.documentElement.style.backgroundColor = '#212121';
    document.body.style.backgroundColor = '#212121';
    window.scrollTo(0, 0);

    // Track upsell purchase if success parameter is present
    const isUpsellSuccess = window.location.search.includes('upsell=success') || window.location.search.includes('upsell_success=1');
    const upsellTracked = sessionStorage.getItem('upsell_tracked') === '1';
    
    if (isUpsellSuccess && !upsellTracked) {
      fireConversionEvent('Purchase', { value: 6.00, currency: 'EUR' });
      trackEvent('upsell_completed');
      sessionStorage.setItem('upsell_tracked', '1');
    }

    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          window.location.href = ESN_URL;
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex flex-col" style={{ fontFamily: "'Rubik', 'Inter', system-ui, sans-serif" }}>
      <div className="py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <img src={esnLogo} alt="ESN" className="h-14 md:h-20 object-contain" style={{ mixBlendMode: 'screen' }} />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-centauro-green/20 flex items-center justify-center border-4 border-centauro-green animate-pulse">
            <CheckCircle size={48} className="text-centauro-green" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Bestellung abgeschlossen!
            </h1>
            <p className="text-primary-foreground/70 text-sm">
              Vielen Dank für deinen Kauf. Du erhältst in Kürze eine Bestätigungs-E-Mail mit allen Details.
            </p>
          </div>

          <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-centauro-gold">
              <Package size={18} />
              <span className="text-xs font-black uppercase tracking-wider">Versand in 24h</span>
            </div>
            <p className="text-[11px] text-primary-foreground/60">
              Dein ESN Paket wird schnellstmöglich versandt. Du erhältst eine Tracking-Nummer per E-Mail.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs text-primary-foreground/60">
              Du wirst in <span className="font-black text-centauro-gold">{seconds}s</span> zur ESN-Website weitergeleitet…
            </p>
            <Button
              onClick={() => (window.location.href = ESN_URL)}
              className="w-full h-12 bg-centauro-gold hover:bg-centauro-gold/90 text-primary font-black uppercase tracking-wider rounded-xl"
            >
              ESN-Shop besuchen <ExternalLink size={14} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
