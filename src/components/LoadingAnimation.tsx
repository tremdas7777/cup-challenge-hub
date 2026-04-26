import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import esnLogo from '@/assets/esn-logo.png';


interface LoadingAnimationProps {
  onComplete: () => void;
}

export default function LoadingAnimation({ onComplete }: LoadingAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const color = '#1A1A1A';
    const themeTags = document.querySelectorAll('meta[name="theme-color"]');

    themeTags.forEach((tag) => tag.setAttribute('content', color));
    document.documentElement.style.backgroundColor = color;
    document.body.style.backgroundColor = color;

    return () => {
      document.documentElement.style.backgroundColor = '#121212';
      document.body.style.backgroundColor = '#121212';
    };
  }, [showSuccess]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setShowSuccess(true), 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showSuccess) {
      // Don't auto-complete; wait for user click
    }
  }, [showSuccess, onComplete]);

  return (
    <div className="bg-primary flex min-h-[100svh] min-h-[100dvh] w-full flex-col relative overflow-hidden overscroll-none">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.15) 20px, rgba(255,255,255,0.15) 40px)' }} />
      </div>

      <div className="flex min-h-[100svh] min-h-[100dvh] items-center justify-center relative z-10 text-center px-6 pb-safe">
        {!showSuccess ? (
          <>
            <div>
              <div className="mb-10 flex items-center justify-center">
                <img
                  src={esnLogo}
                  alt="ESN"
                  className="h-24 md:h-28 object-contain"
                  style={{ mixBlendMode: 'screen', animation: 'pulse 1.5s ease-in-out infinite' }}
                />
              </div>

              <h2 className="text-3xl md:text-4xl font-black text-primary-foreground mb-8 tracking-tight">
                ERGEBNIS WIRD GEPRÜFT
              </h2>

              <div className="max-w-sm mx-auto">
                <div className="bg-primary-foreground/20 rounded-full h-4 overflow-hidden border border-primary-foreground/30 mb-3">
                  <div
                    className="h-full bg-primary-foreground transition-all duration-300 rounded-full flex items-center justify-center"
                    style={{ width: `${progress}%` }}
                  >
                    {progress > 20 && (
                      <span className="text-primary font-black text-[10px]">{progress}%</span>
                    )}
                  </div>
                </div>
                <p className="text-primary-foreground/80 font-bold text-sm">
                  {progress < 33 ? 'Verarbeitung...' : progress < 66 ? 'Validierung...' : 'Abschluss...'}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="fixed inset-0 pointer-events-none">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-float-up text-2xl"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '100%',
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${2 + Math.random()}s`,
                  }}
                >
                  {['🎉', '🎊', '⭐', '🏆'][Math.floor(Math.random() * 4)]}
                </div>
              ))}
            </div>

            <div>
              <div className="animate-bounce">
                <CheckCircle className="w-24 h-24 text-primary-foreground mx-auto mb-5" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-primary-foreground mb-3 tracking-tight">
                BESTANDEN!
              </h1>
              <p className="text-2xl md:text-3xl font-black text-centauro-gold mb-2">
                DU KANNST DIE RUBBELKARTE SPIELEN
              </p>
              <p className="text-lg font-semibold text-primary-foreground/80">
                3 Chancen auf tolle Preise!
              </p>
              <Button
                onClick={onComplete}
                className="mt-8 bg-centauro-green hover:bg-centauro-green/90 text-primary-foreground font-black text-lg px-10 py-6 rounded-xl uppercase tracking-wider"
                style={{ animation: 'pulse-glow-green 2s ease-in-out infinite' }}
              >
                RUBBELKARTE STARTEN
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
