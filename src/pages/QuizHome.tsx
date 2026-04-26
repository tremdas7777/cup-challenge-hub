import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import CentauroHeader from '@/components/CentauroHeader';
import LoadingAnimation from '@/components/LoadingAnimation';
import ScratchCard from '@/components/ScratchCard';
import { CheckCircle, Trophy, Truck, Shield, Clock, Users, Gift, ShoppingCart, Star, Ticket, Plane, MapPin, Zap, X, Check, CircleDot } from 'lucide-react';
import { trackEvent } from '@/lib/funnelTracking';
import { fireConversionEvent } from '@/lib/pixelManager';
import { fireSaleWebhook } from '@/lib/webhookManager';
import esnLogo from '@/assets/esn-logo.png';
import quizBannerPreload from '@/assets/esn-quiz-banner.png';
import gymHero from '@/assets/esn-hero-banner.jpg';
import comboPackImg from '@/assets/esn-combo-pack.png';
import giftCardImg from '@/assets/esn-gift-card.png';
import { Mail, Phone, MapPin as MapPinIcon } from 'lucide-react';
import { playCorrectSound, playWrongSound, playRevealSound, unlockAudio } from '@/lib/quizSounds';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

const quizQuestions: Question[] = [
  {
    id: 1,
    question: 'Wie viel Gramm Protein sollte man täglich pro kg Körpergewicht zu sich nehmen?',
    options: ['0,5g', '1,0g', '1,6–2,2g', '5,0g'],
    correctAnswer: 2,
  },
  {
    id: 2,
    question: 'Welches Supplement ist das meistverkaufte weltweit?',
    options: ['Kreatin', 'Whey Protein', 'BCAAs', 'Omega-3'],
    correctAnswer: 1,
  },
  {
    id: 3,
    question: 'Wofür steht ESN?',
    options: ['European Sport Nutrition', 'Elite Sports Nutrition', 'Essential Supplement Network', 'Energy Sport Nährstoffe'],
    correctAnswer: 1,
  },
  {
    id: 4,
    question: 'Was ist Kreatin-Monohydrat?',
    options: ['Ein Vitamin', 'Ein Kohlenhydrat', 'Eine natürliche Aminosäure', 'Ein Fettverbrenner'],
    correctAnswer: 2,
  },
  {
    id: 5,
    question: 'Wie viele essentielle Aminosäuren gibt es?',
    options: ['5', '9', '12', '20'],
    correctAnswer: 1,
  },
  {
    id: 6,
    question: 'Was ist das anabole Fenster nach dem Training?',
    options: ['5 Minuten', '30–60 Minuten', '24 Stunden', 'Es existiert nicht'],
    correctAnswer: 1,
  },
  {
    id: 7,
    question: 'Welches Vitamin wird durch Sonnenlicht produziert?',
    options: ['Vitamin A', 'Vitamin B12', 'Vitamin C', 'Vitamin D'],
    correctAnswer: 3,
  },
  {
    id: 8,
    question: 'Was ist der Hauptvorteil von Whey Isolat gegenüber Konzentrat?',
    options: ['Besserer Geschmack', 'Höherer Proteingehalt', 'Mehr Fett', 'Mehr Zucker'],
    correctAnswer: 1,
  },
];

export default function QuizHome() {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const [showHome, setShowHome] = useState(true);
  const [homeExiting, setHomeExiting] = useState(false);
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [allAssetsReady, setAllAssetsReady] = useState(false);

  // Preload ALL critical images during splash, then dismiss splash
  useEffect(() => {
    const criticalImages = [esnLogo, quizBannerPreload, gymHero];
    let loaded = 0;
    const total = criticalImages.length;
    const startTime = Date.now();
    const MIN_SPLASH_MS = 1200; // minimum splash duration for UX

    const checkDone = () => {
      loaded++;
      if (loaded >= total) {
        setBannerLoaded(true);
        setAllAssetsReady(true);
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
        setTimeout(() => {
          setSplashExiting(true);
          setTimeout(() => setShowSplash(false), 400);
        }, remaining);
      }
    };

    criticalImages.forEach(src => {
      const img = new Image();
      img.src = src;
      img.onload = checkDone;
      img.onerror = checkDone; // don't block on error
    });

    // Safety timeout: dismiss splash after 4s max even if images fail
    const safetyTimer = setTimeout(() => {
      if (!allAssetsReady) {
        setBannerLoaded(true);
        setAllAssetsReady(true);
        setSplashExiting(true);
        setTimeout(() => setShowSplash(false), 400);
      }
    }, 4000);

    return () => clearTimeout(safetyTimer);
  }, []);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showScratchCard, setShowScratchCard] = useState(false);

  // Centralized Safari theme-color management based on current screen
  useEffect(() => {
    // Use red for splash, loading animation, and scratch card screens; dark for others
    const color = '#1A1A1A';

    let dynamicTag = document.head.querySelector('meta[name="theme-color"][data-dynamic-theme="true"]') as HTMLMetaElement | null;

    if (!dynamicTag) {
      dynamicTag = document.createElement('meta');
      dynamicTag.setAttribute('name', 'theme-color');
      dynamicTag.setAttribute('data-dynamic-theme', 'true');
      document.head.appendChild(dynamicTag);
    }

    dynamicTag.setAttribute('content', color);
    document.documentElement.style.backgroundColor = color;
    document.body.style.backgroundColor = color;

    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, [showSplash, showAnimation, showScratchCard, showHome, quizComplete]);

  const [timeLeft, setTimeLeft] = useState(600);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState<'amarela' | 'azul' | ''>('');
  const [showSelectionError, setShowSelectionError] = useState(false);
  const [viewersCount] = useState(Math.floor(Math.random() * 30) + 38);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [cpfValue, setCpfValue] = useState('');
  const [cpfError, setCpfError] = useState('');

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const validateCpf = (cpf: string): boolean => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== parseInt(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    return rest === parseInt(digits[10]);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpf(e.target.value);
    setCpfValue(formatted);
    setCpfError('');
  };

  const [cpfLoading, setCpfLoading] = useState(false);

  const handleCpfSubmit = async () => {
    if (!validateCpf(cpfValue)) {
      setCpfError('CPF inválido. Verifique e tente novamente.');
      return;
    }
    setCpfError('');
    setCpfLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('consulta-cpf', {
        body: { cpf: cpfValue },
      });
      if (error) throw error;
      const fullName = data?.nome || '';
      setClientName(fullName);
      // Show first name only in popup greeting
      const firstName = fullName.split(' ')[0] || 'Cliente';
      setFirstNameDisplay(firstName);
    } catch (err) {
      console.error('Erro ao consultar CPF:', err);
      setClientName('');
      setFirstNameDisplay('Cliente');
    } finally {
      setCpfLoading(false);
    }
    setShowCepInput(true);
  };
  const [showCepInput, setShowCepInput] = useState(false);
  const [cepValue, setCepValue] = useState('');
  const [cepError, setCepError] = useState('');
  const [freteRevealed, setFreteRevealed] = useState(false);
  const [clientName, setClientName] = useState('');
  const [firstNameDisplay, setFirstNameDisplay] = useState('');

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const validateCep = (cep: string): boolean => {
    const digits = cep.replace(/\D/g, '');
    return digits.length === 8;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCepValue(formatted);
    setCepError('');
  };
  const hasTrackedVisitor = useRef(false);
  const hasTrackedQuizStart = useRef(false);
  const hasTrackedQuizComplete = useRef(false);
  const hasTrackedCheckout = useRef(false);

  // Track visitor on mount
  useEffect(() => {
    if (!hasTrackedVisitor.current) {
      trackEvent('visitor');
      hasTrackedVisitor.current = true;
    }
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

  const handleAnswerClick = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    setShowResult(true);
    const correct = index === quizQuestions[currentQuestion].correctAnswer;
    setIsCorrect(correct);
    unlockAudio();
    if (correct) playCorrectSound();
    else playWrongSound();

    // Auto advance to next question after 1.2s delay
    setTimeout(() => {
      handleNextQuestion();
    }, 1200);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsCorrect(false);
    } else {
      if (!hasTrackedQuizComplete.current) { trackEvent('quiz_completed'); hasTrackedQuizComplete.current = true; } playRevealSound(); setShowAnimation(true);
    }
  };

  const handleGoToCheckout = () => {
    if (!hasTrackedCheckout.current) {
      trackEvent('checkout');
      fireConversionEvent('InitiateCheckout', { value: 12.00, currency: 'EUR' });
      hasTrackedCheckout.current = true;
    }
    const checkoutUrl = 'https://checkout.flowspays.com/checkout/cmofixp5206bc1yp340w0jr1v?offer=L7NXD5Y';
    window.location.href = checkoutUrl;
  };

  // SPLASH SCREEN
  if (showSplash) {
    return (
      <div className={`fixed inset-0 z-50 flex min-h-[100svh] min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden overscroll-none bg-primary transition-all duration-400 ${splashExiting ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`}>
        <div className="relative flex flex-col items-center gap-6">
          <img
            src={esnLogo}
            alt="ESN"
            className="h-16 md:h-24 object-contain animate-fade-in"
            style={{ mixBlendMode: 'screen' }}
          />
          <div className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            <div className="w-2 h-2 rounded-full bg-primary-foreground/80 animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 rounded-full bg-primary-foreground/80 animate-bounce" style={{ animationDelay: '0.15s' }} />
            <div className="w-2 h-2 rounded-full bg-primary-foreground/80 animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      </div>
    );
  }

  // HOME / LANDING PAGE
  if (showHome) {
    return (
      <div className={`bg-foreground flex flex-col min-h-screen min-h-[100svh] min-h-[100dvh] transition-all duration-500 ease-in-out ${homeExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {/* ESN Logo Bar */}
        <div className="bg-primary py-4 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-center">
            <img src={esnLogo} alt="ESN" className="h-14 md:h-20 object-contain" style={{ mixBlendMode: 'screen' }} />
          </div>
        </div>

        {/* Full hero section with single background image */}
        <div
          className="relative flex-1 flex flex-col items-center justify-center text-center px-5 py-16 md:py-20"
          style={{
            backgroundImage: `url(${gymHero})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            minHeight: '80vh',
          }}
        >
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/90" />

          <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">

            <h1 className="text-3xl md:text-5xl font-black text-primary-foreground leading-[1.1] mb-4 tracking-tight drop-shadow-lg">
              Teste dein Fitness-Wissen & gewinne Preise
            </h1>

            <p className="text-sm md:text-lg text-primary-foreground/80 mb-8 leading-relaxed max-w-md drop-shadow">
              Beantworte 8 Fragen über Supplements & Ernährung und <strong className="text-primary-foreground">sichere dir exklusive ESN Prämien</strong>
            </p>

            <Button
              onClick={() => { if (!bannerLoaded) return; if (!hasTrackedQuizStart.current) { trackEvent('quiz_started'); hasTrackedQuizStart.current = true; } setHomeExiting(true); setTimeout(() => setShowHome(false), 500); }}
              className="relative overflow-hidden bg-centauro-green hover:bg-centauro-green/80 text-primary-foreground font-black text-lg md:text-xl px-14 py-7 rounded-lg active:scale-95 uppercase tracking-wider w-full max-w-sm border-2 border-centauro-green/50"
              style={{ animation: 'pulse-glow-green 2s ease-in-out infinite' }}
            >
              <span
                className="absolute inset-0 opacity-30"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 70%, transparent 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2.5s linear infinite',
                }}
              />
              <span className="relative z-10">JETZT STARTEN</span>
            </Button>

            <p className="text-primary-foreground/30 text-[11px] mt-3 font-semibold">100% Kostenlos · 2 Minuten · Sofort Ergebnis</p>

            {/* Social proof */}
            <div className="flex items-center gap-1.5 mt-6 text-primary-foreground/40 text-[11px] font-bold">
              <Users size={12} className="text-centauro-green/70" />
              <span>4.231 Teilnehmer haben bereits mitgemacht</span>
            </div>
          </div>
        </div>


      </div>
    );
  }

  if (showAnimation) {
    return <LoadingAnimation onComplete={() => { setShowAnimation(false); setShowScratchCard(true); trackEvent('scratch_card'); }} />;
  }

  if (showScratchCard) {
    return <ScratchCard onComplete={() => { setShowScratchCard(false); setQuizComplete(true); }} />;
  }

  if (quizComplete) {
    return (
      <div className="min-h-screen bg-background">
        {/* ESN Top Bar */}
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

        {/* Victory */}
        <div className="bg-primary py-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 40px)' }} />
          </div>
          <Trophy className="w-16 h-16 text-centauro-gold mx-auto mb-3" />
          <h1 className="text-4xl md:text-5xl font-black text-primary-foreground mb-2 tracking-tight">
            HERZLICHEN GLÜCKWUNSCH!
          </h1>
          <p className="text-lg font-semibold text-primary-foreground/90">
            Du hast deine exklusiven Prämien freigeschaltet!
          </p>
        </div>

        {/* Bonus Banner */}
        <div className="bg-centauro-gold text-foreground py-0">
          <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-14 h-14 bg-foreground rounded-full flex items-center justify-center">
                  <Gift className="w-7 h-7 text-centauro-gold" />
                </div>
              </div>
              <div className="text-center md:text-left flex-1">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 mb-1">Deine 2 Gewinne</p>
                <h3 className="text-xl md:text-2xl font-black tracking-tight mb-1">
                  ESN BUNDLE + €150 GUTSCHEIN
                </h3>
                <p className="text-sm font-semibold opacity-80">
                  Du hast in der Rubbelkarte das <strong>ESN Bundle</strong> und einen <strong>€150 ESN Gutschein</strong> gewonnen — gratis, du zahlst nur den Versand.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-10">
          {/* Products */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-0.5 flex-1 bg-primary" />
            <h2 className="text-xl font-black text-foreground px-4 tracking-tight uppercase">Deine Prämien</h2>
            <div className="h-0.5 flex-1 bg-primary" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            {/* Bundle */}
            <Card className="overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="relative bg-secondary p-6 flex items-center justify-center h-56">
                <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider z-10">
                  Exklusiv
                </span>
                <img src={comboPackImg} alt="ESN Bundle" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-black text-foreground mb-0.5">ESN Bundle</h3>
                <p className="text-muted-foreground text-xs mb-3">8 Premium ESN Produkte im Set</p>
                <ul className="space-y-1.5 text-xs mb-4">
                  {['Whey Protein, Creatine, Isoclear', 'Pre-Workout, Daily Vitamins, Protein Bar', 'Magnesium, Ashwagandha'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-foreground">
                      <CheckCircle size={12} className="text-centauro-green shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <span className="text-muted-foreground line-through text-xs">€249,90</span>
                  <span className="bg-centauro-green/10 text-centauro-green font-black text-sm px-2 py-0.5 rounded">GRATIS</span>
                </div>
              </div>
            </Card>

            {/* Gift Card €150 */}
            <Card className="overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="relative bg-secondary p-6 flex items-center justify-center h-56">
                <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider z-10">
                  Bonus
                </span>
                <img src={giftCardImg} alt="ESN Gutschein €150" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-black text-foreground mb-0.5">ESN Gutschein €150</h3>
                <p className="text-muted-foreground text-xs mb-3">Einlösbar im offiziellen ESN Shop</p>
                <ul className="space-y-1.5 text-xs mb-4">
                  {['Wert von €150', '12 Monate gültig', 'Kombinierbar mit Aktionen'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-foreground">
                      <CheckCircle size={12} className="text-centauro-green shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <span className="text-muted-foreground line-through text-xs">€150,00</span>
                  <span className="bg-centauro-green/10 text-centauro-green font-black text-sm px-2 py-0.5 rounded">GRATIS</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <Card className="p-6 mb-8 border border-border shadow-sm">
            <h3 className="text-lg font-black text-foreground mb-5 text-center uppercase tracking-tight">
              Bestellübersicht
            </h3>
            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-4 p-3.5 bg-secondary rounded-md">
                <img src={comboPackImg} alt="ESN Bundle" className="w-16 h-16 object-contain" />
                <div className="flex-1">
                  <p className="font-bold text-foreground text-sm">ESN Bundle</p>
                  <p className="text-xs text-muted-foreground">8 Premium Produkte</p>
                </div>
                <p className="font-black text-centauro-green text-sm">GRATIS</p>
              </div>
              <div className="flex items-center gap-4 p-3.5 bg-secondary rounded-md">
                <img src={giftCardImg} alt="ESN Gutschein" className="w-16 h-16 object-contain" />
                <div className="flex-1">
                  <p className="font-bold text-foreground text-sm">ESN Gutschein €150</p>
                  <p className="text-xs text-muted-foreground">Einlösbar im ESN Shop</p>
                </div>
                <p className="font-black text-centauro-green text-sm">GRATIS</p>
              </div>
              <div className="border-t border-foreground/20" />
              <div className="flex items-center gap-4 p-3.5 bg-centauro-gold/10 rounded-md border border-centauro-gold/30">
                <div className="w-16 h-16 flex items-center justify-center text-3xl">🚚</div>
                <div className="flex-1">
                  <p className="font-bold text-foreground text-sm">Versandkosten</p>
                  <p className="text-xs text-muted-foreground">Einziger zu zahlender Betrag</p>
                </div>
                <p className="font-black text-foreground text-base">€12,00</p>
              </div>
            </div>
            <div className="bg-secondary p-5 rounded-md text-center">
              <p className="text-muted-foreground text-xs font-medium mb-1">Du sparst</p>
              <p className="text-3xl font-black text-foreground mb-0.5 line-through decoration-destructive decoration-2">€399,90</p>
              <p className="text-sm font-bold text-centauro-green">Du zahlst nur €12,00 Versand!</p>
            </div>
          </Card>

          {/* CTA */}
          <div className="bg-primary rounded-xl p-8 md:p-10 text-center mb-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.15) 20px, rgba(255,255,255,0.15) 40px)' }} />
            </div>
            <div className="relative z-10">
              <Gift className="w-10 h-10 text-primary-foreground mx-auto mb-3 opacity-80" />
              <p className="text-primary-foreground/60 text-xs font-bold tracking-[0.2em] uppercase mb-2">
                Letzter Schritt
              </p>
              <h3 className="text-3xl md:text-4xl font-black text-primary-foreground mb-2 tracking-tight">
                SICHERE DIR JETZT DEINE PRÄMIEN
              </h3>
              <p className="text-primary-foreground/70 text-xs font-semibold mb-6 max-w-sm mx-auto">
                Bundle + €150 Gutschein gratis — du zahlst nur <span className="text-centauro-gold font-black">€12 Versand</span>!
              </p>
              <Button
                onClick={() => {
                  handleGoToCheckout();
                }}
                className="w-full max-w-sm bg-centauro-green hover:bg-centauro-green/80 text-primary-foreground font-black text-sm md:text-base py-8 px-2 rounded-lg transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center text-center"
                style={{ boxShadow: '0 6px 25px hsl(145 63% 42% / 0.5)', animation: 'pulse-glow-green 2s ease-in-out infinite' }}
              >
                JETZT SICHERN — NUR €12 VERSAND
              </Button>
              <div className="flex items-center justify-center gap-1.5 mt-4">
                <Truck size={12} className="text-centauro-gold" />
                <p className="text-centauro-gold text-xs font-bold">
                  Versandkosten: nur €12,00
                </p>
              </div>
              <p className="text-primary-foreground/40 text-[10px] font-medium mt-2">
                ⏰ Angebot gültig für {formatTime(timeLeft)}
              </p>
            </div>
          </div>

          {/* Address / CPF Dialog */}
          <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
             <DialogContent className="max-w-[calc(100%-2.5rem)] sm:max-w-md mx-auto rounded-2xl p-5 max-h-[85dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-center text-xl font-black text-foreground">
                  {showCepInput ? `Hallo, ${firstNameDisplay || 'Kunde'}! 👋` : 'Identifikation'}
                </DialogTitle>
              </DialogHeader>

              {!showCepInput ? (
                <div className="space-y-4 pt-2">
                  <div className="bg-secondary p-4 rounded-lg text-center">
                    <img src={esnLogo} alt="ESN" className="h-10 mx-auto mb-3 object-contain" style={{ mixBlendMode: 'screen' }} />
                    <p className="font-bold text-foreground text-sm mb-1">Bereits ESN Kunde?</p>
                    <p className="text-muted-foreground text-xs mb-3">Gib deine E-Mail ein, um deine Daten zu finden</p>
                    <Input
                      placeholder="000.000.000-00"
                      value={cpfValue}
                      onChange={handleCpfChange}
                      inputMode="numeric"
                      pattern="[0-9]*"
className={`text-center text-lg tracking-widest ${cpfError ? 'border-destructive' : ''}`}
                      style={{ fontFamily: "'Rubik', sans-serif" }}
                      maxLength={14}
                    />
                    {cpfError && (
                      <p className="text-destructive text-xs font-semibold mt-2">{cpfError}</p>
                    )}
                    <Button
                      onClick={handleCpfSubmit}
                      className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-5"
                      disabled={cpfValue.replace(/\D/g, '').length < 11 || cpfLoading}
                    >
                      {cpfLoading ? 'Suche...' : 'Meine Daten suchen'}
                    </Button>
                  </div>

                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-muted-foreground text-xs font-semibold">oder</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <Button
                    onClick={() => {
                      setShowAddressDialog(false);
                      navigate(`/checkout?cor=${selectedColor}&tamanho=${selectedSize}`);
                    }}
                    variant="outline"
                    className="w-full py-5 font-bold text-sm"
                  >
                    <MapPin size={16} className="mr-2" />
                    Adresse manuell eingeben
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="bg-secondary p-4 rounded-lg text-center">
                    <Truck size={24} className="text-primary mx-auto mb-3" />
                    <p className="font-bold text-foreground text-sm mb-1">
                      Daten erfolgreich gefunden!
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Klicke unten, um fortzufahren
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setShowAddressDialog(false);
                      navigate(`/checkout?nome=${encodeURIComponent(clientName)}&cpf=${encodeURIComponent(cpfValue)}&cor=${selectedColor}&tamanho=${selectedSize}`);
                    }}
                    className="w-full bg-centauro-green hover:bg-centauro-green/80 text-primary-foreground font-black text-base py-6 rounded-lg"
                    style={{ boxShadow: '0 6px 25px hsl(145 63% 42% / 0.5)' }}
                  >
                    WEITER
                  </Button>
                  <Button
                    onClick={() => setShowCepInput(false)}
                    variant="ghost"
                    className="w-full text-muted-foreground text-xs"
                  >
                    ← Zurück
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: CheckCircle, color: 'text-foreground', title: 'Sofortiger Versand', desc: 'Bundle + Gutschein' },
              { icon: Truck, color: 'text-foreground', title: 'Lieferung', desc: '3-5 Werktage' },
              { icon: Shield, color: 'text-foreground', title: 'Sicher', desc: 'Geschützter Kauf' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-card p-3.5 rounded-lg border border-border text-center">
                <Icon className={`${color} mx-auto mb-1.5`} size={20} />
                <h4 className="font-bold text-foreground text-xs">{title}</h4>
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <Card className="p-5 md:p-6 border border-border shadow-sm mb-8">
            <h3 className="text-base font-black text-foreground mb-4 text-center uppercase tracking-tight">
              Häufig gestellte Fragen
            </h3>
            <div className="space-y-2.5">
              {[
                { q: 'Wie funktioniert die Lieferung?', a: 'Nach Bestätigung erhältst du eine E-Mail mit Tracking-Nummer. Lieferung in 3-5 Werktagen.' },
                { q: 'Kann ich zurückgeben?', a: 'Ja! 30 Tage Garantie. Geld-zurück ohne Fragen.' },
                { q: 'Sind meine Daten sicher?', a: '100% sicher! SSL 256-bit. Wir teilen niemals deine Daten.' },
                { q: 'Brauche ich Support?', a: '24/7 Support via WhatsApp, E-Mail und Chat.' },
              ].map((faq, i) => (
                <div key={i} className="bg-secondary p-3.5 rounded-md">
                  <p className="font-bold text-foreground text-xs mb-0.5">{faq.q}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
           </Card>

        </div>

        {/* Footer preto */}
        <footer className="bg-centauro-black py-8 px-4">
          <div className="max-w-xl mx-auto text-white">
            <div className="mb-5">
              <img src={esnLogo} alt="ESN" className="h-10 mb-4" style={{ mixBlendMode: 'screen' }} />
              <h4 className="font-bold text-sm mb-2">Schnelllinks</h4>
              <p className="text-xs opacity-80">Startseite</p>
            </div>

            <div className="mb-5">
              <h4 className="font-bold text-sm mb-2">Kontakt</h4>
              <div className="flex items-center gap-2 mb-1.5">
                <Mail size={14} className="opacity-80" />
                <span className="text-xs opacity-80">info@esn.com</span>
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <Phone size={14} className="opacity-80" />
                <span className="text-xs opacity-80">+49 (0) 5741 2389-0</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPinIcon size={14} className="opacity-80" />
                <span className="text-xs opacity-80">Lübbecke, Deutschland</span>
              </div>
            </div>

            <div className="mb-5">
              <h4 className="font-bold text-sm mb-2">Rechtliche Informationen</h4>
              <p className="text-xs opacity-80"><strong>USt-IdNr.:</strong> DE 123456789</p>
              <p className="text-xs opacity-80"><strong>Firma:</strong> Fitmart GmbH & Co. KG</p>
            </div>

            <div className="border-t border-white/20 pt-4 mb-5">
              <h4 className="font-bold text-sm mb-2">Sicherheit & Vertrauen</h4>
              <div className="grid grid-cols-2 gap-1.5">
                <span className="text-xs opacity-80">✓ SSL 256-bit Verschlüsselung</span>
                <span className="text-xs opacity-80">✓ 30 Tage Garantie</span>
                <span className="text-xs opacity-80">✓ 24/7 Support</span>
                <span className="text-xs opacity-80">✓ Daten geschützt</span>
              </div>
            </div>

            <div className="border-t border-white/20 pt-4 text-center">
              <p className="text-[10px] opacity-60">© 2026 ESN - Elite Sports Nutrition. Alle Rechte vorbehalten.</p>
              <p className="text-[10px] opacity-60 mt-1">Aktion gültig solange der Vorrat reicht.</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Quiz screen
  const question = quizQuestions[currentQuestion];
  if (!question) return null;
  const progressPercent = ((currentQuestion + 1) / quizQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-background animate-fade-in" style={{ animation: 'fade-in 0.5s ease-out' }}>
      <CentauroHeader />

      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Header: Flag + Question counter + Timer */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🇩🇪</span>
            <span className="text-sm font-bold text-foreground">
              Frage {currentQuestion + 1} von {quizQuestions.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock size={15} />
            <span className="text-sm font-bold tabular-nums">{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Question Card */}
        <Card className="p-5 md:p-7 border border-border shadow-sm mb-5">
          {/* Difficulty badge */}
          <span className="inline-flex items-center gap-1 bg-centauro-green/15 text-centauro-green text-xs font-bold px-2.5 py-1 rounded-full mb-4">
            ⚡ {currentQuestion < 4 ? 'Leicht' : currentQuestion < 7 ? 'Mittel' : 'Schwer'}
          </span>

          <h2 className="text-xl md:text-2xl font-black text-foreground mb-6 leading-tight">
            {question.question}
          </h2>
          <div className="space-y-2.5">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrectAnswer = index === question.correctAnswer;
              let btnClass = 'w-full p-4 text-left font-semibold rounded-xl transition-all duration-200 border-2 text-sm ';

              if (selectedAnswer === null) {
                btnClass += 'bg-card border-border hover:border-centauro-green hover:bg-centauro-green/5 cursor-pointer';
              } else if (isSelected) {
                btnClass += isCorrect
                  ? 'bg-centauro-green/10 border-centauro-green text-centauro-green'
                  : 'bg-destructive/10 border-destructive text-destructive';
              } else if (isCorrectAnswer) {
                btnClass += 'bg-centauro-green/10 border-centauro-green text-centauro-green';
              } else {
                btnClass += 'bg-secondary border-border text-muted-foreground';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerClick(index)}
                  disabled={selectedAnswer !== null}
                  className={btnClass}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Dot progress indicator */}
        <div className="flex justify-center gap-2 mb-5">
          {quizQuestions.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i === currentQuestion
                  ? 'bg-centauro-green scale-125'
                  : i < currentQuestion
                  ? 'bg-centauro-green/50'
                  : 'bg-border'
              }`}
            />
          ))}
        </div>

        {/* Feedback */}
        {showResult && (
          <div className={`p-3.5 rounded-xl text-center font-bold mb-5 text-sm border-2 ${
            isCorrect
              ? 'bg-centauro-green/10 border-centauro-green text-centauro-green'
              : 'bg-destructive/10 border-destructive text-destructive'
          }`}>
            {isCorrect ? '✓ Richtig! Gut gemacht!' : '✗ Leider falsch!'}
          </div>
        )}


      </div>

      <footer className="bg-primary mt-8 py-8 px-4">
        <div className="max-w-xl mx-auto text-primary-foreground">
          <div className="mb-5">
            <h4 className="font-bold text-sm mb-2">Schnelllinks</h4>
            <p className="text-xs opacity-80">Startseite</p>
          </div>

          <div className="mb-5">
            <h4 className="font-bold text-sm mb-2">Kontakt</h4>
            <div className="flex items-center gap-2 mb-1.5">
              <Mail size={14} className="opacity-80" />
              <span className="text-xs opacity-80">info@esn.com</span>
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <Phone size={14} className="opacity-80" />
              <span className="text-xs opacity-80">+49 (0) 5741 2389-0</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPinIcon size={14} className="opacity-80" />
              <span className="text-xs opacity-80">Lübbecke, Deutschland</span>
            </div>
          </div>

          <div className="mb-5">
            <h4 className="font-bold text-sm mb-2">Rechtliche Informationen</h4>
            <p className="text-xs opacity-80"><strong>USt-IdNr.:</strong> DE 123456789</p>
            <p className="text-xs opacity-80"><strong>Firma:</strong> Fitmart GmbH & Co. KG</p>
          </div>

          <div className="border-t border-primary-foreground/20 pt-4 mb-5">
            <h4 className="font-bold text-sm mb-2">Sicherheit & Vertrauen</h4>
            <div className="grid grid-cols-2 gap-1.5">
              <span className="text-xs opacity-80">✓ SSL 256-bit Verschlüsselung</span>
              <span className="text-xs opacity-80">✓ 30 Tage Garantie</span>
              <span className="text-xs opacity-80">✓ 24/7 Support</span>
              <span className="text-xs opacity-80">✓ Daten geschützt</span>
            </div>
          </div>

          <div className="border-t border-primary-foreground/20 pt-4 text-center">
            <p className="text-[10px] opacity-60">© 2026 ESN - Elite Sports Nutrition. Alle Rechte vorbehalten.</p>
            <p className="text-[10px] opacity-60 mt-1">Aktion gültig solange der Vorrat reicht.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
