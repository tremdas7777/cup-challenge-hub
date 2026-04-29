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

import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

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
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
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
    // Trigger payment intent init early
    if (validateEmail(email) && !clientSecret && !paymentLoading) {
      initPaymentIntent();
    }
  }, [email, clientSecret, paymentLoading]);

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

  const initPaymentIntent = async () => {
    if (clientSecret || paymentLoading) return; 
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const cfg = await fetchPaymentGatewayConfig();
      if (!cfg.stripe?.publicKey || !cfg.stripe?.secretKey) {
        setPaymentError('Zahlungsgateway nicht konfiguriert.');
        return;
      }

      setStripePromise(loadStripe(cfg.stripe.publicKey));

      const { data, error: fnErr } = await supabase.functions.invoke('criar-payment-intent', {
        body: {
          secretKey: cfg.stripe.secretKey,
          amount: shippingCost || 12.00,
          buyerName: nome || 'Kunde',
          buyerEmail: email,
          buyerPhone: telefone || '',
          itemsDescription: 'nutrition supplements guide eBook',
          metadata: {
            address: endereco || '',
            addressNumber: numero || '',
            itemsDescription: 'nutrition supplements guide eBook',
          },
        },
      });

      if (fnErr) throw fnErr;
      if (data?.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        throw new Error('Kein Client Secret erhalten.');
      }
    } catch (e: any) {
      console.error('Error init payment:', e);
      setPaymentError(e.message || 'Fehler bei der Zahlungsinitialisierung.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSubmit = async () => {
    // This will be handled by the Embedded PaymentForm now
    console.log('Submit triggered, but should be handled by PaymentForm sub-component');
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
  const isStep2Valid = (cep.length === 5 || cep.length === 8) && !!endereco && !!numero && !!cidade && !!estado && !!shippingMethod;
  const isFormValid = isStep1Valid && isStep2Valid;

  const scrollToFirstError = () => {
    const firstError = document.querySelector('[data-field-error="true"]');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNextStep = () => {
    setShowFieldErrors(true);
    if (currentStep === 1 && isStep1Valid) {
      setShowFieldErrors(false);
      setCurrentStep(2);
      initPaymentIntent(); // Start pre-loading Stripe fields
      trackEvent('checkout_step_2'); 
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (currentStep === 1) {
      scrollToFirstError();
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
      <div className="bg-foreground text-primary-foreground py-2.5 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-center gap-6 text-xs font-bold">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-white" />
            <span>Angebot endet in:</span>
            <span className="text-white animate-countdown font-mono">{formatTime(timeLeft)}</span>
          </div>
          <div className="hidden md:flex items-center gap-2 border-l border-white/20 pl-6">
            <Users size={14} className="text-white" />
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
                    ? 'bg-foreground text-primary-foreground'
                    : step.number < currentStep
                    ? 'bg-foreground/10 text-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                  currentStep === step.number
                    ? 'bg-primary-foreground/20'
                    : step.number < currentStep
                    ? 'bg-foreground/20'
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
              <User size={16} className="text-foreground" />
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

        {/* STEP 2 & 3: Adresse & Zahlung (Unificado) */}
        {currentStep >= 2 && (
          <div className="animate-fade-in">
            <Card className="border border-border bg-white shadow-sm overflow-hidden">
              {/* Seção Endereço */}
              <div className="p-5 md:p-6 border-b border-border/50">
                <div className="flex items-center gap-2 mb-5">
                  <MapPin size={16} className="text-foreground" />
                  <h3 className="text-base font-black text-foreground uppercase tracking-tight">Lieferadresse</h3>
                </div>

                <div className="space-y-4">
                  {/* PLZ */}
                  <div data-field-error={showFieldErrors && (cep.length !== 5 && cep.length !== 8) ? 'true' : undefined}>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">PLZ</label>
                    <div className="relative">
                      <Input
                        placeholder="00000"
                        value={cep}
                        onChange={handleCepChange}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className={`py-5 border-2 ${(showFieldErrors && cep.length !== 5 && cep.length !== 8) ? 'border-destructive' : 'border-border'}`}
                        maxLength={8}
                      />
                      {cepLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Endereço + Número */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2" data-field-error={showFieldErrors && !endereco ? 'true' : undefined}>
                      <label className="text-xs font-bold text-foreground mb-1.5 block">Straße</label>
                      <Input
                        placeholder="Straße, Hausnummer..."
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                        className={`py-5 border-2 ${showFieldErrors && !endereco ? 'border-destructive' : 'border-border'}`}
                      />
                    </div>
                    <div data-field-error={showFieldErrors && !numero ? 'true' : undefined}>
                      <label className="text-xs font-bold text-foreground mb-1.5 block">Nr.</label>
                      <Input
                        placeholder="Nr."
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        className={`py-5 border-2 ${showFieldErrors && !numero ? 'border-destructive' : 'border-border'}`}
                      />
                    </div>
                  </div>

                  {/* Bairro + Cidade + Estado */}
                  <div className="grid grid-cols-[1fr_1fr_80px] gap-4">
                    <div>
                      <label className="text-xs font-bold text-foreground mb-1.5 block">Stadtteil</label>
                      <Input placeholder="Stadtteil" value={bairro} onChange={(e) => setBairro(e.target.value)} className="py-5 border-2 border-border" />
                    </div>
                    <div data-field-error={showFieldErrors && !cidade ? 'true' : undefined}>
                      <label className="text-xs font-bold text-foreground mb-1.5 block">Stadt</label>
                      <Input placeholder="Stadt" value={cidade} onChange={(e) => setCidade(e.target.value)} className={`py-5 border-2 ${showFieldErrors && !cidade ? 'border-destructive' : 'border-border'}`} />
                    </div>
                    <div data-field-error={showFieldErrors && !estado ? 'true' : undefined}>
                      <label className="text-xs font-bold text-foreground mb-1.5 block">Bundesland</label>
                      <Input placeholder="BL" value={estado} onChange={(e) => setEstado(e.target.value)} className={`py-5 border-2 ${showFieldErrors && !estado ? 'border-destructive' : 'border-border'}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção Pagamento */}
              <div className="p-5 md:p-6 bg-muted/5">
                <div className="flex items-center gap-2 mb-5">
                  <CreditCard size={16} className="text-foreground" />
                  <h3 className="text-base font-black text-foreground uppercase tracking-tight">Zahlungsmethode</h3>
                </div>

                {clientSecret && stripePromise ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'flat',
                        variables: {
                          colorPrimary: '#000000',
                          colorBackground: '#ffffff',
                          colorText: '#212121',
                          borderRadius: '8px',
                        }
                      }
                    }}
                  >
                    <PaymentForm 
                      amount={shippingCost} 
                      buyer={{
                        nome, email, telefone, cep, endereco, numero, complemento, bairro, cidade, estado
                      }}
                      isAddressValid={isStep2Valid}
                      onInvalidAddress={() => {
                        setShowFieldErrors(true);
                        scrollToFirstError();
                      }}
                    />
                  </Elements>
                ) : paymentError ? (
                  <div className="py-8 text-center space-y-4">
                    <p className="text-destructive text-sm font-bold">{paymentError}</p>
                    <Button variant="outline" onClick={() => initPaymentIntent()} className="text-xs">
                      Nochmal versuchen
                    </Button>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-centauro-green" />
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Sichere Verbindung wird aufgebaut...</p>
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-4 mt-6 opacity-40">
                  <Shield size={14} className="text-foreground" />
                  <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">Sicheres SSL-Protokoll</span>
                  <Lock size={14} className="text-foreground" />
                </div>
              </div>
            </Card>
          </div>
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

function PaymentForm({ amount, buyer, isAddressValid, onInvalidAddress }: { amount: number; buyer: any; isAddressValid: boolean; onInvalidAddress: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    if (!isAddressValid) {
      onInvalidAddress();
      return;
    }

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
      setError(stripeError.message || 'Zahlungsfehler.');
      setLoading(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      trackEvent('purchase');
      navigate('/obrigado');
    } else {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        className="w-full bg-centauro-green hover:bg-centauro-green/80 text-primary-foreground font-black text-lg py-8 rounded-lg shadow-xl transition-all hover:scale-[1.02] active:scale-95"
        style={{ boxShadow: '0 8px 30px hsl(145 63% 42% / 0.4)', animation: 'pulse-glow-green 2s ease-in-out infinite' }}
      >
        {loading ? (
          <><Loader2 size={18} className="mr-2 animate-spin" /> BITTE WARTEN...</>
        ) : (
          `JETZT BESTÄTIGEN — €${amount.toFixed(2).replace('.', ',')}`
        )}
      </Button>
    </form>
  );
}
