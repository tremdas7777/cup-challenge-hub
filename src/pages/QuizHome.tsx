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
import camisaAmarelaImg from '@/assets/camisa-brasil-hero.webp';
import camisaAzulImg from '@/assets/camisa-azul.png';
import albumImg from '@/assets/album-copa-hero.webp';
import centauroLogo from '@/assets/centauro-logo.webp';
import stadiumHero from '@/assets/stadium-hero.webp';
import centauroWorldcupLogo from '@/assets/centauro-worldcup-logo.webp';
import cbfLogo from '@/assets/cbf-logo.webp';
import ingressosVipImg from '@/assets/ingressos-vip-copa.png';
import quizBannerPreload from '@/assets/quiz-banner-hq.webp';
import quizBannerHome from '@/assets/quiz-banner-home.webp';
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
    question: 'Quantas vezes o Brasil ganhou a Copa do Mundo?',
    options: ['3 vezes', '4 vezes', '5 vezes', '6 vezes'],
    correctAnswer: 2,
  },
  {
    id: 2,
    question: 'Em que ano o Brasil venceu sua primeira Copa do Mundo?',
    options: ['1950', '1958', '1962', '1970'],
    correctAnswer: 1,
  },
  {
    id: 3,
    question: 'Qual jogador é o maior artilheiro da Seleção em Copas?',
    options: ['Ronaldo Fenômeno', 'Pelé', 'Ronaldinho', 'Neymar'],
    correctAnswer: 0,
  },
  {
    id: 4,
    question: 'Quantos gols Pelé marcou pela Seleção Brasileira?',
    options: ['70 gols', '77 gols', '85 gols', '90 gols'],
    correctAnswer: 1,
  },
  {
    id: 5,
    question: 'Contra qual seleção será o segundo jogo do Brasil na fase de grupos da Copa do Mundo 2026?',
    options: ['Haiti', 'Escócia', 'Marrocos', 'Colômbia'],
    correctAnswer: 1,
  },
  {
    id: 6,
    question: 'Qual seleção é a maior rival do Brasil em Copas?',
    options: ['Itália', 'Alemanha', 'Argentina', 'França'],
    correctAnswer: 2,
  },
  {
    id: 7,
    question: 'Qual país sediará a Copa do Mundo 2026?',
    options: ['Brasil', 'Argentina', 'EUA, México e Canadá', 'Austrália'],
    correctAnswer: 2,
  },
  {
    id: 8,
    question: 'Quantas Copas do Mundo Ronaldo Fenômeno disputou?',
    options: ['2 Copas', '3 Copas', '4 Copas', '5 Copas'],
    correctAnswer: 2,
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
    const criticalImages = [centauroLogo, cbfLogo, quizBannerPreload, stadiumHero, camisaAmarelaImg, camisaAzulImg, albumImg];
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
    const isRedScreen = showSplash || showAnimation || showScratchCard;
    const color = isRedScreen ? '#E30613' : '#212121';

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
      fireConversionEvent('InitiateCheckout', { value: 44.90, currency: 'BRL' });
      hasTrackedCheckout.current = true;
    }
    const checkoutUrl = localStorage.getItem('checkoutUrl') || 'https://seu-checkout.com/taxa-envio';
    window.location.href = checkoutUrl;
  };

  // SPLASH SCREEN
  if (showSplash) {
    return (
      <div className={`fixed inset-0 z-50 flex min-h-[100svh] min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden overscroll-none bg-primary transition-all duration-400 ${splashExiting ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`}>
        <div className="relative flex flex-col items-center gap-6">
          <img
            src={centauroLogo}
            alt="Centauro"
            className="h-16 md:h-24 object-contain brightness-0 invert animate-fade-in"
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
        <div className="bg-primary py-4 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-center -translate-x-2">
            <img src={centauroLogo} alt="Centauro" className="h-14 md:h-20 object-contain brightness-0 invert" />
            <div className="w-px h-8 bg-primary-foreground/30 ml-2 mr-4" />
            <img src={cbfLogo} alt="CBF" className="h-14 md:h-20 object-contain" />
          </div>
        </div>

        {/* Players banner - same size as quiz */}
        <div className="w-full h-40 md:h-56 lg:h-72 relative overflow-hidden z-10">
          <img
             src={quizBannerPreload}
            alt="Jogadores Seleção Brasileira"
            className="w-full h-full object-cover object-top block"
            style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 65%, rgba(0,0,0,0.3) 85%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 0%, black 65%, rgba(0,0,0,0.3) 85%, transparent 100%)' }}
          />
        </div>

        {/* Hero content with stadium as background - fills all remaining space */}
        <div
          className="relative flex-1 flex flex-col items-center justify-center text-center px-5 py-16 md:py-12 -mt-12 min-h-[60vh]"
          style={{ backgroundImage: `url(${stadiumHero})`, backgroundSize: 'cover', backgroundPosition: 'center top' }}
        >
          <div className="absolute inset-0 bg-foreground/80" />
          <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">

            <h1 className="text-3xl md:text-5xl font-black text-primary-foreground leading-[1.1] mb-4 tracking-tight">
              Prove que você é o maior torcedor do Brasil
            </h1>

            <p className="text-sm md:text-lg text-primary-foreground/70 mb-8 leading-relaxed max-w-md">
              Teste seus conhecimentos sobre a Seleção e <strong className="text-primary-foreground">desbloqueie prêmios exclusivos</strong>
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
              <span className="relative z-10">PARTICIPAR AGORA</span>
            </Button>

            <p className="text-primary-foreground/30 text-[11px] mt-3 font-semibold">100% Gratuito · 2 minutos · Resultado na hora</p>

            {/* Minimal social proof */}
            <div className="flex items-center gap-1.5 mt-6 text-primary-foreground/40 text-[11px] font-bold">
              <Users size={12} className="text-centauro-green/70" />
              <span>2.847 pessoas já participaram</span>
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
        {/* Centauro Top Bar */}
        <div className="bg-primary py-4 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-center -translate-x-2">
            <img src={centauroLogo} alt="Centauro" className="h-14 md:h-20 object-contain brightness-0 invert" />
            <div className="w-px h-8 bg-primary-foreground/30 ml-2 mr-4" />
            <img src={cbfLogo} alt="CBF" className="h-14 md:h-20 object-contain" />
          </div>
        </div>

        {/* Urgency Bar */}
        <div className="bg-foreground text-primary-foreground py-2.5">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-center gap-6 text-xs font-bold">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-primary" />
              <span>Oferta expira em:</span>
              <span className="text-primary animate-countdown font-mono">{formatTime(timeLeft)}</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Users size={14} className="text-centauro-gold" />
              <span>{viewersCount} pessoas vendo agora</span>
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
            PARABÉNS!
          </h1>
          <p className="text-lg font-semibold text-primary-foreground/90">
            Você desbloqueou seus prêmios exclusivos!
          </p>
        </div>

        {/* Contest Banner - 2 Ingressos Copa */}
        <div className="bg-centauro-gold text-foreground py-0">
          <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-14 h-14 bg-foreground rounded-full flex items-center justify-center">
                  <Ticket className="w-7 h-7 text-centauro-gold" />
                </div>
              </div>
              <div className="text-center md:text-left flex-1">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 mb-1">Bônus Exclusivo</p>
                <h3 className="text-xl md:text-2xl font-black tracking-tight mb-1">
                  CONCORRA A 2 INGRESSOS PARA A COPA 2026!
                </h3>
                <p className="text-sm font-semibold opacity-80">
                  Ao garantir seus prêmios, você automaticamente concorre a <strong>2 ingressos VIP</strong> para assistir a Copa do Mundo 2026 com <strong>tudo pago</strong>!
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="bg-foreground/10 rounded-md p-3 text-center">
                <Plane className="w-5 h-5 mx-auto mb-1 opacity-80" />
                <p className="text-[10px] font-bold">Passagem Aérea</p>
                <p className="text-[9px] opacity-70">Ida e Volta</p>
              </div>
              <div className="bg-foreground/10 rounded-md p-3 text-center">
                <MapPin className="w-5 h-5 mx-auto mb-1 opacity-80" />
                <p className="text-[10px] font-bold">Hospedagem</p>
                <p className="text-[9px] opacity-70">Hotel 5 Estrelas</p>
              </div>
              <div className="bg-foreground/10 rounded-md p-3 text-center">
                <Ticket className="w-5 h-5 mx-auto mb-1 opacity-80" />
                <p className="text-[10px] font-bold">2 Ingressos VIP</p>
                <p className="text-[9px] opacity-70">Jogo do Brasil</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-10">
          {/* Products */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-0.5 flex-1 bg-primary" />
            <h2 className="text-xl font-black text-foreground px-4 tracking-tight uppercase">Seus Prêmios</h2>
            <div className="h-0.5 flex-1 bg-primary" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            {/* Camisa */}
            <Card data-shirt-card className={`overflow-hidden border shadow-sm hover:shadow-md transition-shadow ${showSelectionError && (!selectedSize || !selectedColor) ? 'border-destructive' : 'border-border'}`}>
              <div className="relative bg-secondary p-6 flex items-center justify-center h-56">
                <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider">
                  Exclusivo
                </span>
                <img src={selectedColor === 'azul' ? camisaAzulImg : camisaAmarelaImg} alt="Camisa Brasil 2026" className="max-h-44 object-contain" loading="eager" fetchPriority="high" />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-black text-foreground mb-0.5">Camisa Brasil 2026</h3>
                <p className="text-muted-foreground text-xs mb-3">Seleção Brasileira - Edição Copa do Mundo</p>
                
                {/* Color selector */}
                <div className="mb-3">
                  <p className="text-xs font-bold text-foreground mb-2">Cor:</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setSelectedColor('amarela'); setShowSelectionError(false); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-black border-2 transition-all ${
                        selectedColor === 'amarela'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-yellow-400 border border-yellow-500" />
                      Amarela
                    </button>
                    <button
                      onClick={() => { setSelectedColor('azul'); setShowSelectionError(false); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-black border-2 transition-all ${
                        selectedColor === 'azul'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-800 border border-blue-900" />
                      Azul
                    </button>
                  </div>
                  {showSelectionError && !selectedColor && <p className="text-destructive text-xs font-semibold mt-1.5">Selecione uma cor</p>}
                </div>

                {/* Size selector */}
                <div className="mb-3">
                  <p className="text-xs font-bold text-foreground mb-2">Tamanho:</p>
                  <div className="flex gap-2">
                    {['P', 'M', 'G', 'GG', 'XG', 'XXG'].map((size) => (
                      <button
                        key={size}
                        onClick={() => { setSelectedSize(size); setShowSelectionError(false); }}
                        className={`w-10 h-10 rounded-md text-xs font-black border-2 transition-all ${
                          selectedSize === size
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-secondary text-foreground border-border hover:border-primary/50'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  {showSelectionError && !selectedSize && <p className="text-destructive text-xs font-semibold mt-1.5">Selecione um tamanho</p>}
                </div>
                <ul className="space-y-1.5 text-xs mb-4">
                  {['Qualidade Premium', 'Bordado Oficial CBF'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-foreground">
                      <CheckCircle size={12} className="text-centauro-green shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <span className="text-muted-foreground line-through text-xs">R$ 249,90</span>
                  <span className="bg-centauro-green/10 text-centauro-green font-black text-sm px-2 py-0.5 rounded">GRÁTIS</span>
                </div>
              </div>
            </Card>

            {/* Álbum */}
            <Card className="overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="relative bg-secondary p-6 flex items-center justify-center h-56">
                <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider">
                  Exclusivo
                </span>
                <img src={albumImg} alt="Álbum Copa 2026" className="max-h-44 object-contain" loading="eager" fetchPriority="high" />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-black text-foreground mb-0.5">Álbum Copa 2026</h3>
                <p className="text-muted-foreground text-xs mb-3">Panini + 50 Pacotes de Figurinhas</p>
                <ul className="space-y-1.5 text-xs mb-4">
                  {['140+ packs de figurinhas', 'Edição Limitada FIFA', 'Figurinhas Exclusivas'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-foreground">
                      <CheckCircle size={12} className="text-centauro-green shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <span className="text-muted-foreground line-through text-xs">R$ 189,90</span>
                  <span className="bg-centauro-green/10 text-centauro-green font-black text-sm px-2 py-0.5 rounded">GRÁTIS</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <Card className="p-6 mb-8 border border-border shadow-sm">
            <h3 className="text-lg font-black text-foreground mb-5 text-center uppercase tracking-tight">
              Resumo do Pedido
            </h3>
            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-4 p-3.5 bg-secondary rounded-md">
                <img src={selectedColor === 'azul' ? camisaAzulImg : camisaAmarelaImg} alt={`Camisa Brasil 2026 ${selectedColor === 'azul' ? 'Azul' : 'Amarela'}`} className="w-16 h-16 object-contain rounded" />
                <div className="flex-1">
                  <p className="font-bold text-foreground text-sm">Camisa Brasil 2026 {selectedColor === 'azul' ? '(Azul)' : selectedColor === 'amarela' ? '(Amarela)' : ''}</p>
                  <p className="text-xs text-muted-foreground">Edição Copa do Mundo{selectedSize ? ` • Tam: ${selectedSize}` : ''}</p>
                </div>
                <p className="font-black text-centauro-green text-sm">GRÁTIS</p>
              </div>
              <div className="flex items-center gap-4 p-3.5 bg-secondary rounded-md">
                <img src={albumImg} alt="Álbum Copa 2026" className="w-16 h-16 object-contain rounded" />
                <div className="flex-1">
                  <p className="font-bold text-foreground text-sm">Álbum Copa 2026 + 50 Packs</p>
                  <p className="text-xs text-muted-foreground">Panini Edição Limitada</p>
                </div>
                <p className="font-black text-centauro-green text-sm">GRÁTIS</p>
              </div>
              <div className="border-t border-foreground/20" />
              <div className="flex items-center gap-4 p-3.5 bg-centauro-gold/10 rounded-md border border-centauro-gold/30">
                <img src={ingressosVipImg} alt="Ingressos VIP Copa 2026" className="w-16 h-16 object-contain rounded flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-foreground text-sm">Concorrendo a 2 Ingressos VIP da Copa</p>
                  <p className="text-xs text-muted-foreground">Passagem + Hotel + Ingressos VIP • Sorteio em 15/06/2026</p>
                </div>
                <p className="font-black text-centauro-gold text-sm">INCLUSO</p>
              </div>
            </div>
            <div className="bg-secondary p-5 rounded-md text-center">
              <p className="text-muted-foreground text-xs font-medium mb-1">Você economiza</p>
              <p className="text-3xl font-black text-foreground mb-0.5 line-through decoration-destructive decoration-2">R$ 439,80</p>
              <p className="text-sm font-bold text-centauro-green">em prêmios 100% gratuitos!</p>
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
                Último Passo
              </p>
              <h3 className="text-3xl md:text-4xl font-black text-primary-foreground mb-2 tracking-tight">
                RESGATE SEUS PRÊMIOS AGORA
              </h3>
              <p className="text-primary-foreground/70 text-xs font-semibold mb-6 max-w-sm mx-auto">
                Resgate imediato da camisa e álbum + concorra ao <span className="text-centauro-gold font-black">sorteio de 2 ingressos VIP</span> para a Copa 2026! Sorteio: 15/06/2026
              </p>
              <Button
                onClick={() => {
                  if (!selectedSize || !selectedColor) {
                    setShowSelectionError(true);
                    const card = document.querySelector('[data-shirt-card]');
                    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                  }
                  const isExternal = localStorage.getItem('externalCheckout') === 'true';
                  if (isExternal) {
                    handleGoToCheckout();
                  } else {
                    setShowAddressDialog(true);
                  }
                }}
                className="w-full max-w-sm bg-centauro-green hover:bg-centauro-green/80 text-primary-foreground font-black text-base py-6 rounded-lg transition-transform hover:scale-[1.02] active:scale-95"
                style={{ boxShadow: '0 6px 25px hsl(145 63% 42% / 0.5)', animation: 'pulse-glow-green 2s ease-in-out infinite' }}
              >
                GARANTIR MEUS PRÊMIOS
              </Button>
              <div className="flex items-center justify-center gap-1.5 mt-4">
                <Ticket size={12} className="text-centauro-gold" />
                <p className="text-centauro-gold text-xs font-bold">
                  + Sorteio de 2 Ingressos VIP Copa 2026 (Data: 15/06/2026)
                </p>
              </div>
              <p className="text-primary-foreground/40 text-[10px] font-medium mt-2">
                ⏰ Oferta válida por {formatTime(timeLeft)}
              </p>
            </div>
          </div>

          {/* Address / CPF Dialog */}
          <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
             <DialogContent className="max-w-[calc(100%-2.5rem)] sm:max-w-md mx-auto rounded-2xl p-5 max-h-[85dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-center text-xl font-black text-foreground">
                  {showCepInput ? `Olá, ${firstNameDisplay || 'Cliente'}! 👋` : 'Identificação'}
                </DialogTitle>
              </DialogHeader>

              {!showCepInput ? (
                <div className="space-y-4 pt-2">
                  <div className="bg-secondary p-4 rounded-lg text-center">
                    <img src={centauroLogo} alt="Centauro" className="h-10 mx-auto mb-3 object-contain" />
                    <p className="font-bold text-foreground text-sm mb-1">Já é cliente Centauro?</p>
                    <p className="text-muted-foreground text-xs mb-3">Insira seu CPF para localizar seus dados</p>
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
                      {cpfLoading ? 'Buscando...' : 'Buscar meus dados'}
                    </Button>
                  </div>

                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-muted-foreground text-xs font-semibold">ou</span>
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
                    Inserir endereço manualmente
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="bg-secondary p-4 rounded-lg text-center">
                    <Truck size={24} className="text-primary mx-auto mb-3" />
                    <p className="font-bold text-foreground text-sm mb-1">
                      Dados encontrados com sucesso!
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Clique abaixo para prosseguir com o resgate
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
                    CONTINUAR
                  </Button>
                  <Button
                    onClick={() => setShowCepInput(false)}
                    variant="ghost"
                    className="w-full text-muted-foreground text-xs"
                  >
                    ← Voltar
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: CheckCircle, color: 'text-foreground', title: 'Resgate Imediato', desc: 'Camisa + Álbum' },
              { icon: Truck, color: 'text-foreground', title: 'Entrega', desc: '3-5 dias úteis' },
              { icon: Shield, color: 'text-foreground', title: 'Seguro', desc: 'Compra protegida' },
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
              Perguntas Frequentes
            </h3>
            <div className="space-y-2.5">
              {[
                { q: 'Como funciona a entrega?', a: 'Após confirmar, você recebe um email com rastreamento. Entrega em 3-5 dias úteis.' },
                { q: 'Posso devolver?', a: 'Sim! Garantia de 30 dias. Devolvemos seu dinheiro sem perguntas.' },
                { q: 'Meus dados estão seguros?', a: '100% seguro! SSL 256-bit. Nunca compartilhamos seus dados.' },
                { q: 'Preciso de suporte?', a: 'Suporte 24/7 via WhatsApp, Email e Chat.' },
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
              <img src={centauroLogo} alt="Centauro" className="h-10 mb-4 brightness-0 invert" />
              <h4 className="font-bold text-sm mb-2">Links Rápidos</h4>
              <p className="text-xs opacity-80">Início</p>
            </div>

            <div className="mb-5">
              <h4 className="font-bold text-sm mb-2">Contato</h4>
              <div className="flex items-center gap-2 mb-1.5">
                <Mail size={14} className="opacity-80" />
                <span className="text-xs opacity-80">sac@centauro.com.br</span>
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <Phone size={14} className="opacity-80" />
                <span className="text-xs opacity-80">+55 (11) 3003-4916</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPinIcon size={14} className="opacity-80" />
                <span className="text-xs opacity-80">São Paulo, SP - Brasil</span>
              </div>
            </div>

            <div className="mb-5">
              <h4 className="font-bold text-sm mb-2">Informação Legal</h4>
              <p className="text-xs opacity-80"><strong>CNPJ:</strong> 06.347.409/0001-90</p>
              <p className="text-xs opacity-80"><strong>Razão Social:</strong> SBF Comércio de Produtos Esportivos S.A.</p>
            </div>

            <div className="border-t border-white/20 pt-4 mb-5">
              <h4 className="font-bold text-sm mb-2">Segurança e Confiança</h4>
              <div className="grid grid-cols-2 gap-1.5">
                <span className="text-xs opacity-80">✓ SSL 256-bit Cifrado</span>
                <span className="text-xs opacity-80">✓ Garantia de 30 dias</span>
                <span className="text-xs opacity-80">✓ Suporte 24/7</span>
                <span className="text-xs opacity-80">✓ Dados Protegidos</span>
              </div>
            </div>

            <div className="border-t border-white/20 pt-4 text-center">
              <p className="text-[10px] opacity-60">© 2026 Centauro Esportes. Todos os direitos reservados.</p>
              <p className="text-[10px] opacity-60 mt-1">Promoção válida enquanto durar o estoque.</p>
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
            <span className="text-2xl">🇧🇷</span>
            <span className="text-sm font-bold text-foreground">
              Pergunta {currentQuestion + 1} de {quizQuestions.length}
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
            ⚡ {currentQuestion < 4 ? 'Fácil' : currentQuestion < 7 ? 'Médio' : 'Difícil'}
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
            {isCorrect ? '✓ Correto! Muito bem!' : '✗ Não foi dessa vez!'}
          </div>
        )}


      </div>

      {/* Footer vermelho */}
      <footer className="bg-primary mt-8 py-8 px-4">
        <div className="max-w-xl mx-auto text-primary-foreground">
          <div className="mb-5">
            <h4 className="font-bold text-sm mb-2">Links Rápidos</h4>
            <p className="text-xs opacity-80">Início</p>
          </div>

          <div className="mb-5">
            <h4 className="font-bold text-sm mb-2">Contato</h4>
            <div className="flex items-center gap-2 mb-1.5">
              <Mail size={14} className="opacity-80" />
              <span className="text-xs opacity-80">sac@centauro.com.br</span>
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <Phone size={14} className="opacity-80" />
              <span className="text-xs opacity-80">+55 (11) 3003-4916</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPinIcon size={14} className="opacity-80" />
              <span className="text-xs opacity-80">São Paulo, SP - Brasil</span>
            </div>
          </div>

          <div className="mb-5">
            <h4 className="font-bold text-sm mb-2">Informação Legal</h4>
            <p className="text-xs opacity-80"><strong>CNPJ:</strong> 06.347.409/0001-90</p>
            <p className="text-xs opacity-80"><strong>Razão Social:</strong> SBF Comércio de Produtos Esportivos S.A.</p>
          </div>

          <div className="border-t border-primary-foreground/20 pt-4 mb-5">
            <h4 className="font-bold text-sm mb-2">Segurança e Confiança</h4>
            <div className="grid grid-cols-2 gap-1.5">
              <span className="text-xs opacity-80">✓ SSL 256-bit Cifrado</span>
              <span className="text-xs opacity-80">✓ Garantia de 30 dias</span>
              <span className="text-xs opacity-80">✓ Suporte 24/7</span>
              <span className="text-xs opacity-80">✓ Dados Protegidos</span>
            </div>
          </div>

          <div className="border-t border-primary-foreground/20 pt-4 text-center">
            <p className="text-[10px] opacity-60">© 2026 Centauro Esportes. Todos os direitos reservados.</p>
            <p className="text-[10px] opacity-60 mt-1">Promoção válida enquanto durar o estoque.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
