import esnLogo from "@/assets/esn-logo.png";
import quizBanner from "@/assets/esn-quiz-banner.png";

export default function EsnHeader() {
  return (
    <header className="relative overflow-hidden">
      {/* Top bar with logo */}
      <div className="bg-primary py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <img src={esnLogo} alt="ESN" className="h-14 md:h-20 object-contain" style={{ mixBlendMode: 'screen' }} />
        </div>
      </div>

      {/* Banner */}
      <div className="w-full h-40 md:h-64 relative overflow-hidden">
        <img src={quizBanner} alt="ESN Fitness Quiz" className="w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
      </div>
    </header>
  );
}
