import centauroLogo from "@/assets/centauro-logo.webp";
import cbfLogo from "@/assets/cbf-logo.webp";
import quizBanner from "@/assets/quiz-banner-hq.webp";

export default function CentauroHeader() {
  return (
    <header className="relative overflow-hidden">
      {/* Top bar with logos */}
      <div className="bg-primary py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center -translate-x-2">
          <img src={centauroLogo} alt="Centauro" className="h-14 md:h-20 object-contain brightness-0 invert" />
          <div className="w-px h-8 bg-primary-foreground/30 ml-2 mr-4" />
          <img src={cbfLogo} alt="CBF" className="h-14 md:h-20 object-contain" />
        </div>
      </div>

      {/* Banner */}
      <div className="w-full h-40 md:h-64 relative overflow-hidden">
        <img src={quizBanner} alt="Quiz Copa 2026" className="w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
      </div>
    </header>
  );
}
