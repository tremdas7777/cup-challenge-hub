import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Truck, Shield, Lock, Ticket, Clock, Users, Loader2, ChevronRight, User, MapPin, CreditCard } from 'lucide-react';
import esnLogo from '@/assets/esn-logo.png';
import comboPackImg from '@/assets/esn-combo-pack.png';
import giftCardImg from '@/assets/esn-gift-card.png';
import { trackEvent } from '@/lib/funnelTracking';
import { fireConversionEvent, getPixelConfig } from '@/lib/pixelManager';
import { fireWebhookEvent } from '@/lib/webhookManager';
import { fetchPaymentGatewayConfig } from '@/lib/paymentGateway';
import { sendUtmifyPending, sendUtmifySale } from '@/lib/utmifyManager';
import { getAttribution, getTrackingParameters } from '@/lib/attribution';
import { supabase } from '@/integrations/supabase/client';
import { findNearestStore, type CentauroStore } from '@/lib/centauroStores';

interface GoogleStore {
  name: string;
  address: string;
  rating: number | null;
  open_now: boolean | null;
  place_id: string;
}
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction
} from '@/components/ui/alert-dialog';

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const prefilledName = searchParams.get('nome') || '';
  const [currentStep, setCurrentStep] = useState(1);
  const [nome, setNome] = useState(prefilledName);
  const [email, setEmail] = useState('');
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [telefone, setTelefone] = useState('');
  const [telefoneError, setTelefoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<'sedex' | 'retirada' | null>('sedex');
  const [showStoreError, setShowStoreError] = useState(false);
  const [showCepError, setShowCepError] = useState(false);
  const [nearestStore, setNearestStore] = useState<CentauroStore | null>(null);
  const [googleStores, setGoogleStores] = useState<GoogleStore[]>([]);
  const [selectedGoogleStore, setSelectedGoogleStore] = useState<GoogleStore | null>(null);
  const [storesLoading, setStoresLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [viewersCount] = useState(Math.floor(Math.random() * 30) + 38);

  const [showFieldErrors, setShowFieldErrors] = useState(false);

  // Credit card support
  const [cardError, setCardError] = useState('');
  const [cardLoading, setCardLoading] = useState(false);

  const cepValid = cep.replace(/\D/g, '').length === 5 && !!endereco;
  const [shippingCost, setShippingCost] = useState(10.00);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (prefilledName && !nome) {
      setNome(prefilledName);
    }
    // Load product ticket from gateway config (default: €10 shipping fee)
    fetchPaymentGatewayConfig().then((cfg) => {
      if (cfg.externalCheckoutEnabled && cfg.externalCheckoutUrl) {
        window.location.href = cfg.externalCheckoutUrl;
        return;
      }
      const value = (cfg.productTicketCents || 1000) / 100;
      setShippingCost(value);
      // Track checkout event with the dynamic value
      trackEvent('checkout');
      trackEvent('checkout_step_1'); // Schritt 1: Persönliche Daten
      fireConversionEvent('InitiateCheckout', { value, currency: 'EUR' });
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatCep = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 8);
  };

  const formatTelefone = (value: string) => {
    return value.replace(/[^\d+]/g, '').slice(0, 15);
  };



  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);

    if (formatted.length === 5 || formatted.length === 8) {
      setCepLoading(true);
      try {
        let url = '';
        if (formatted.length === 5) {
          url = `https://api.zippopotam.us/de/${formatted}`;
        } else {
          url = `https://viacep.com.br/ws/${formatted}/json/`;
        }

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (formatted.length === 5) { // Germany
            if (data.places && data.places.length > 0) {
              const place = data.places[0];
              setCidade(place['place name']);
              setEstado(place['state']);
              setBairro(place['place name']);
            }
          } else { // Brazil
            if (!data.erro) {
              setEndereco(data.logradouro);
              setBairro(data.bairro);
              setCidade(data.localidade);
              setEstado(data.uf);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching address:', error);
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (false) {
      setShowStoreError(true);
      return;
    }

    trackEvent('purchase');
    // Para PIX, o evento "Purchase" é disparado apenas quando o pagamento é confirmado (no PixPopup).
    // Utmify "venda_pendente" também é enviado pelo PixPopup quando o popup abre.

    // Persist buyer data for upsell flow on /obrigado
    try {
      sessionStorage.removeItem('upsell_completed');
      sessionStorage.setItem('upsell_buyer', JSON.stringify({
        nome, email, telefone,
        cep, endereco, numero, complemento, bairro, cidade, estado,
      }));
    } catch {}

    const gatewayConfig = await fetchPaymentGatewayConfig();
    const hasStripeKeys = !!gatewayConfig.stripe?.secretKey?.trim();

    console.log('Gateway config:', JSON.stringify({ activeGateway: 'stripe', stripeHasSecret: hasStripeKeys }));

    const purchaseMetadata: Record<string, string> = {
      address: endereco,
      addressNumber: numero,
      complement: complemento,
      neighborhood: bairro || '',
      city: cidade,
      state: estado,
      cep: cep.replace(/\D/g, ''),
      shippingMethod: shippingMethod || 'sedex',
      shippingCostCents: String(Math.round((shippingCost || 12.00) * 100)),
      itemsDescription: 'nutrition supplements guide eBook',
      attribution: JSON.stringify(getAttribution()),
      trackingParameters: JSON.stringify(getTrackingParameters()),
    };

    if (true) { // Always use embedded Stripe Elements checkout
      if (!hasStripeKeys) {
        setCardError('Stripe-Gateway nicht konfiguriert. Bitte Admin-Bereich prüfen.');
        setTimeout(() => setCardError(''), 8000);
        return;
      }

      // Save buyer data and navigate to embedded payment page
      const buyerData = {
        nome,
        email,
        telefone,
        cep: cep.replace(/\D/g, ''),
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        shippingMethod: shippingMethod || 'sedex',
        shippingCost: shippingCost || 12.00,
      };
      sessionStorage.setItem('esn_checkout_buyer', JSON.stringify(buyerData));
      window.location.href = '/pagamento';
    }
  };



  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const emailDomains = ['@gmail.com', '@outlook.com', '@hotmail.com', '@yahoo.com', '@icloud.com'];

  const getEmailSuggestions = (): string[] => {
    if (!email || email.includes('@')) {
      if (email.includes('@')) {
        const [local, domain] = email.split('@');
        if (local && domain !== undefined) {
          return emailDomains
            .filter(d => d.slice(1).startsWith(domain) && d.slice(1) !== domain)
            .map(d => `${local}${d}`);
        }
      }
      return [];
    }
    return emailDomains.map(d => `${email}${d}`);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setShowEmailSuggestions(true);
    if (value && !value.includes('@')) {
      setEmailError('');
    } else if (value && !validateEmail(value)) {
      setEmailError('Ungültige E-Mail-Adresse.');
    } else {
      setEmailError('');
    }
  };

  const handleSelectEmailSuggestion = (suggestion: string) => {
    setEmail(suggestion);
    setShowEmailSuggestions(false);
    if (!validateEmail(suggestion)) {
      setEmailError('Ungültige E-Mail-Adresse.');
    } else {
      setEmailError('');
    }
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTelefone(e.target.value);
    setTelefone(formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 10) {
      setTelefoneError('Ungültige Telefonnummer.');
    } else {
      setTelefoneError('');
    }
  };

  // Step validations
  const isStep1Valid = nome && email && !emailError && validateEmail(email) && telefone.length >= 8 && !telefoneError;
  const isStep2Valid = cep.length === 5 && endereco && numero && cidade && estado && shippingMethod;
  const isFormValid = isStep1Valid && isStep2Valid;

  const scrollToFirstError = () => {
    setTimeout(() => {
      const firstError = document.querySelector('[data-field-error="true"]');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleNextStep = () => {
    setShowFieldErrors(true);
    if (currentStep === 1 && isStep1Valid) {
      setShowFieldErrors(false);
      setCurrentStep(2);
      trackEvent('checkout_step_2'); // cliente avançou para endereço
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 1) {
      scrollToFirstError();
    } else if (currentStep === 2) {
      if (!shippingMethod) {
        setShippingMethod('sedex');
      }
      const stepValid = cep.replace(/\D/g, '').length === 5 && !!endereco && !!numero && !!cidade && !!estado;
      if (stepValid) {
        setShowFieldErrors(false);
        setCurrentStep(3);
        trackEvent('checkout_step_3'); // cliente avançou para pagamento
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        scrollToFirstError();
      }
    }
  };

  const steps = [
    { number: 1, label: 'Daten', icon: User },
    { number: 2, label: 'Adresse', icon: MapPin },
    { number: 3, label: 'Zahlung', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Rubik', 'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-primary py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <img src={esnLogo} alt="ESN" className="h-14 md:h-20 object-contain" style={{ mixBlendMode: 'screen' }} />
        </div>
      </div>

      {/* Urgency Bar */}
      <div className="bg-foreground text-primary-foreground py-2.5">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-center gap-6 text-xs font-bold">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-centauro-gold" />
            <span>Angebot endet in:</span>
            <span className="text-centauro-gold animate-countdown font-mono">{formatTime(timeLeft)}</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Users size={14} className="text-centauro-gold" />
            <span>{viewersCount} Personen sehen sich das gerade an</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-6">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div
                onClick={() => {
                  if (step.number < currentStep) setCurrentStep(step.number);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all cursor-pointer ${
                  currentStep === step.number
                    ? 'bg-centauro-green text-primary-foreground'
                    : step.number < currentStep
                    ? 'bg-centauro-green/20 text-centauro-green'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                  currentStep === step.number
                    ? 'bg-primary-foreground/20'
                    : step.number < currentStep
                    ? 'bg-centauro-green/30'
                    : 'bg-muted-foreground/20'
                }`}>
                  {step.number < currentStep ? (
                    <CheckCircle size={14} />
                  ) : (
                    step.number
                  )}
                </div>
                <span className="text-xs font-bold hidden sm:inline">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight size={16} className="mx-1 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Order summary mini */}
        <Card className="p-4 mb-6 border border-border">
          <h3 className="text-sm font-black text-foreground mb-3 uppercase tracking-tight">Bestellübersicht</h3>
          <div className="flex items-center gap-3 mb-2">
            <img src={comboPackImg} alt="nutrition supplements guide eBook" className="w-12 h-12 object-contain" />
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">nutrition supplements guide eBook</p>
              <p className="text-[10px] text-muted-foreground">8 Premium Produkte</p>
            </div>
            <span className="text-xs font-black text-centauro-green">GRATIS</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <img src={giftCardImg} alt="ESN Gutschein" className="w-12 h-12 object-contain" />
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">ESN Gutschein €150</p>
              <p className="text-[10px] text-muted-foreground">Einlösbar im ESN Shop</p>
            </div>
            <span className="text-xs font-black text-centauro-green">GRATIS</span>
          </div>
          <div className="border-t border-foreground/10 my-2" />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center text-2xl">🚚</div>
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">Versandkosten</p>
              <p className="text-[10px] text-muted-foreground">Einziger zu zahlender Betrag</p>
            </div>
            <span className="text-xs font-black text-foreground">€{shippingCost.toFixed(2).replace('.', ',')}</span>
          </div>
        </Card>

        {/* STEP 1: Identifikation */}
        {currentStep === 1 && (
          <Card className="p-5 md:p-6 mb-6 border border-border animate-fade-in">
            <div className="flex items-center gap-2 mb-5">
              <User size={16} className="text-centauro-green" />
              <h3 className="text-base font-black text-foreground uppercase tracking-tight">Persönliche Daten</h3>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div data-field-error={showFieldErrors && !nome ? 'true' : undefined}>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Vollständiger Name</label>
                <Input
                  placeholder="Dein vollständiger Name"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={`py-5 ${showFieldErrors && !nome ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {showFieldErrors && !nome && <p className="text-destructive text-xs font-semibold mt-1.5">Pflichtfeld</p>}
              </div>

              {/* Email + Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div data-field-error={showFieldErrors && (!email || !!emailError) ? 'true' : undefined} className="relative">
                  <label className="text-xs font-bold text-foreground mb-1.5 block">E-Mail</label>
                  <Input
                    type="email"
                    placeholder="deine@email.de"
                    value={email}
                    onChange={handleEmailChange}
                    onFocus={() => setShowEmailSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
                    autoComplete="off"
                    className={`py-5 ${emailError || (showFieldErrors && !email) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {showEmailSuggestions && getEmailSuggestions().length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {getEmailSuggestions().map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onMouseDown={() => handleSelectEmailSuggestion(suggestion)}
                          className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                  {emailError && <p className="text-destructive text-xs font-semibold mt-1.5">{emailError}</p>}
                  {showFieldErrors && !email && !emailError && <p className="text-destructive text-xs font-semibold mt-1.5">Pflichtfeld</p>}
                </div>
                <div data-field-error={showFieldErrors && (telefone.replace(/\D/g, '').length < 10 || !!telefoneError) ? 'true' : undefined}>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Telefonnummer</label>
                  <Input
                    placeholder="+49 000 0000000"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    className={`py-5 ${telefoneError || (showFieldErrors && telefone.replace(/\D/g, '').length < 10) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    inputMode="numeric"
                    maxLength={15}
                  />
                  {telefoneError && <p className="text-destructive text-xs font-semibold mt-1.5">{telefoneError}</p>}
                  {showFieldErrors && !telefone && !telefoneError && <p className="text-destructive text-xs font-semibold mt-1.5">Pflichtfeld</p>}
                </div>
              </div>


            </div>

            <Button
              onClick={handleNextStep}
              className="w-full bg-centauro-green hover:bg-centauro-green/80 text-primary-foreground font-black text-base py-7 rounded-lg mt-6 transition-transform hover:scale-[1.02] active:scale-95"
            >
              WEITER <ChevronRight size={18} className="ml-1" />
            </Button>
          </Card>
        )}

        {/* STEP 2: Frete */}
        {currentStep === 2 && (
          <Card className="p-5 md:p-6 mb-6 border border-border animate-fade-in">
            <div className="flex items-center gap-2 mb-5">
              <MapPin size={16} className="text-centauro-green" />
              <h3 className="text-base font-black text-foreground uppercase tracking-tight">Lieferadresse</h3>
            </div>

            <div className="space-y-4">
               {/* PLZ */}
               <div data-field-error={showFieldErrors && cep.length !== 5 ? 'true' : undefined}>
                 <label className="text-xs font-bold text-foreground mb-1.5 block">PLZ</label>
                 <div className="relative">
                   <Input
                     placeholder="00000"
                     value={cep}
                     onChange={handleCepChange}
                     inputMode="numeric"
                     pattern="[0-9]*"
                     className={`py-5 ${showFieldErrors && cep.length !== 5 ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                     maxLength={5}
                   />
                   {cepLoading && (
                     <div className="absolute right-3 top-1/2 -translate-y-1/2">
                       <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                     </div>
                   )}
                 </div>
                 {showFieldErrors && cep.length !== 5 && <p className="text-destructive text-xs font-semibold mt-1.5">Pflichtfeld</p>}
               </div>

              {/* Endereço + Número */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2" data-field-error={showFieldErrors && !endereco ? 'true' : undefined}>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Straße</label>
                  <Input
                    placeholder="Straße, Hausnummer..."
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className={`py-5 ${showFieldErrors && !endereco ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {showFieldErrors && !endereco && <p className="text-destructive text-xs font-semibold mt-1.5">Pflichtfeld</p>}
                </div>
                <div data-field-error={showFieldErrors && !numero ? 'true' : undefined}>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Nr.</label>
                  <Input
                    placeholder="Nr."
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    inputMode="text"
                    pattern="[0-9]*"
                    className={`py-5 ${showFieldErrors && !numero ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {showFieldErrors && !numero && <p className="text-destructive text-xs font-semibold mt-1.5">Pflichtfeld</p>}
                </div>
              </div>

              {/* Complemento */}
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Zusatz <span className="text-muted-foreground font-normal">(optional)</span></label>
                <Input
                  placeholder="Wohnung, Stockwerk..."
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className="py-5"
                />
              </div>

              {/* Bairro + Cidade + Estado */}
              <div className="grid grid-cols-[1fr_1fr_80px] gap-4">
                <div data-field-error={showFieldErrors && !bairro ? 'true' : undefined}>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Stadtteil</label>
                  <Input placeholder="Stadtteil" value={bairro} onChange={(e) => setBairro(e.target.value)} className={`py-5 ${showFieldErrors && !bairro ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                  {showFieldErrors && !bairro && <p className="text-destructive text-xs font-semibold mt-1.5">Pflichtfeld</p>}
                </div>
                <div data-field-error={showFieldErrors && !cidade ? 'true' : undefined}>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Stadt</label>
                  <Input placeholder="Stadt" value={cidade} onChange={(e) => setCidade(e.target.value)} className={`py-5 ${showFieldErrors && !cidade ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                  {showFieldErrors && !cidade && <p className="text-destructive text-xs font-semibold mt-1.5">Pflichtfeld</p>}
                </div>
                <div data-field-error={showFieldErrors && !estado ? 'true' : undefined}>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Bundesland</label>
                  <select value={estado} onChange={(e) => setEstado(e.target.value)} className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${showFieldErrors && !estado ? 'border-destructive focus:ring-destructive' : ''}`}>
                    <option value="">BL</option>
                    {["BW","BY","BE","BB","HB","HH","HE","MV","NI","NW","RP","SL","SN","ST","SH","TH"].map(bl => (
                      <option key={bl} value={bl}>{bl}</option>
                    ))}
                  </select>
                  {showFieldErrors && !estado && <p className="text-destructive text-xs font-semibold mt-1.5">Pflichtfeld</p>}
                </div>
              </div>


            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1 py-7 font-bold text-sm"
              >
                Zurück
              </Button>
              <Button
                onClick={handleNextStep}
                className="flex-[2] bg-centauro-green hover:bg-centauro-green/80 text-primary-foreground font-black text-base py-7 rounded-lg transition-transform hover:scale-[1.02] active:scale-95"
              >
                WEITER <ChevronRight size={18} className="ml-1" />
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 3: Pagamento */}
        {currentStep === 3 && (
          <Card className="p-5 md:p-6 mb-6 border border-border animate-fade-in">
            <div className="flex items-center gap-2 mb-5">
              <CreditCard size={16} className="text-centauro-green" />
              <h3 className="text-base font-black text-foreground uppercase tracking-tight">Zahlungsmethode</h3>
            </div>

            {/* Summary of previous steps */}
            <div className="space-y-4 mb-6">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-foreground uppercase">Persönliche Daten</h4>
                  <button onClick={() => setCurrentStep(1)} className="text-[10px] font-bold text-centauro-green hover:underline">Bearbeiten</button>
                </div>
                <p className="text-xs text-muted-foreground">{nome}</p>
                <p className="text-xs text-muted-foreground">{email} • {telefone}</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-foreground uppercase">Lieferung</h4>
                  <button onClick={() => setCurrentStep(2)} className="text-[10px] font-bold text-centauro-green hover:underline">Bearbeiten</button>
                </div>
                <p className="text-xs text-muted-foreground">{endereco}, {numero}{complemento ? `, ${complemento}` : ''}</p>
                <p className="text-xs text-muted-foreground">{bairro} — {cidade}/{estado} — PLZ {cep}</p>
                <p className="text-xs font-bold text-centauro-green">✓ Kostenloser Versand nach ganz Deutschland</p>
              </div>


            </div>

              <div className="border-2 border-centauro-green rounded-lg p-4 bg-centauro-green/5 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-centauro-green flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-centauro-green" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-foreground">Kreditkarte</p>
                    <p className="text-[10px] text-muted-foreground">Einmalzahlung (1x)</p>
                  </div>
                  <span className="text-lg font-black text-centauro-green">€{(shippingCost || 12.00).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

            {cardError && (
              <div className="mb-3 p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-bold text-center border border-destructive/30">
                {cardError}
              </div>
            )}

              <Button
                onClick={() => {
                  if (!isFormValid) {
                    setShowFieldErrors(true);
                    return;
                  }
                  handleSubmit();
                }}
                disabled={cardLoading}
                className="w-full bg-centauro-green hover:bg-centauro-green/80 text-primary-foreground font-black text-base py-7 rounded-lg transition-transform hover:scale-[1.02] active:scale-95"
                style={{ boxShadow: '0 6px 25px hsl(145 63% 42% / 0.5)', animation: 'pulse-glow-green 2s ease-in-out infinite' }}
              >
                {cardLoading ? (
                  <><Loader2 size={18} className="mr-2 animate-spin" /> BITTE WARTEN...</>
                ) : (
                  'JETZT BESTÄTIGEN'
                )}
              </Button>
          </Card>
        )}

        {/* Trust */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: CheckCircle, color: 'text-foreground', title: 'Sofortiger Versand' },
            { icon: Truck, color: 'text-foreground', title: '3-5 Werktage' },
            { icon: Shield, color: 'text-foreground', title: 'Sicherer Kauf' },
          ].map(({ icon: Icon, color, title }) => (
            <div key={title} className="bg-card p-3 rounded-lg border border-border text-center">
              <Icon className={`${color} mx-auto mb-1`} size={18} />
              <p className="text-[10px] font-bold text-foreground">{title}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <img src={esnLogo} alt="ESN" className="h-10 mx-auto mb-2 opacity-30" />
          <p className="text-muted-foreground text-[10px]">© 2026 ESN - Elite Sports Nutrition. Alle Rechte vorbehalten.</p>
        </div>
      </div>

      {/* Store Unavailable Error Popup */}
      <AlertDialog open={showStoreError} onOpenChange={setShowStoreError}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] mx-auto rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Unidade Indisponível</AlertDialogTitle>
            <AlertDialogDescription>
              A unidade <strong>{nearestStore ? nearestStore.name : 'Centauro mais próxima'}</strong> está indisponível para retirada presencial no momento. Por favor, selecione o envio via Correios SEDEX.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShippingMethod('sedex');
                setShowStoreError(false);
              }}
              className="bg-centauro-green hover:bg-centauro-green/80"
            >
              Enviar por SEDEX — R$ {shippingCost.toFixed(2).replace('.', ',')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CEP Error Popup */}
      <AlertDialog open={showCepError} onOpenChange={setShowCepError}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] mx-auto rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Ungültige PLZ</AlertDialogTitle>
            <AlertDialogDescription>
              Die angegebene PLZ wurde nicht gefunden. Bitte überprüfen Sie die Nummer und versuchen Sie es erneut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowCepError(false);
                setCep('');
              }}
              className="bg-primary hover:bg-primary/80"
            >
              Nochmal versuchen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
}
