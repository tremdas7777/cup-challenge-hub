import esnLogo from "@/assets/esn-logo.png";
import quizBanner from "@/assets/esn-hero-proteins.webp";

export default function EsnHeader() {
  return (
    <header className="relative overflow-hidden">
      {/* Top bar with logo */}
      <div className="bg-primary py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <img src={esnLogo} alt="ESN" className="h-14 md:h-20 object-contain" style={{ mixBlendMode: 'screen' }} />
        </div>
      </div>

      {/* Banner — responsive */}
      <div className="w-full bg-foreground relative overflow-hidden aspect-[770/440] sm:aspect-[16/7] md:aspect-[21/7] max-h-[420px]">
        <img
          src={quizBanner}
          alt="ESN Whey Protein, Isoclear & Protein Coffee"
          className="w-full h-full object-cover object-center"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent pointer-events-none" />
      </div>
    </header>
  );
}

