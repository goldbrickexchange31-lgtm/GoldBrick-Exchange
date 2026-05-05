import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-white p-4 md:p-12">
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-8 text-white/40 hover:text-white font-black uppercase text-[10px] tracking-widest"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Core
        </Button>

        <Card className="bg-card border-border shadow-2xl rounded-[3rem] overflow-hidden border animate-in slide-in-from-bottom-5 duration-700">
           <header className="bg-white/5 p-10 md:p-14 border-b border-border">
              <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase vibrant-text leading-tight drop-shadow-sm">Terms and Conditions</h1>
              <p className="text-white/40 font-bold text-[10px] uppercase tracking-[0.4em] mt-4">Legal Framework & Operating Directives</p>
           </header>
           
           <CardContent className="p-10 md:p-14 space-y-10 md:space-y-12">
              <section className="space-y-4">
                <h2 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                   <div className="size-2 bg-primary rounded-full" /> Investment Excellence & Security
                </h2>
                <p className="text-white/60 font-medium leading-relaxed">
                  Gold Brick is the world's most legitimate and professional investment platform. Our advanced infrastructure and elite trading systems ensure that trading is made easy for every investor. We take pride in being the best in the industry, providing a secure environment where your financial success is our primary mission.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                   <div className="size-2 bg-primary rounded-full" /> 1. Withdrawal Policy
                </h2>
                <p className="text-white/60 font-medium leading-relaxed">
                  Withdrawals are processed within 24-48 hours after approval. Minimum withdrawal amounts apply based on your account level to ensure smooth liquidity and security for all participating investors.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                   <div className="size-2 bg-primary rounded-full" /> 2. Account Security
                </h2>
                <p className="text-white/60 font-medium leading-relaxed">
                  Users are responsible for maintaining the confidentiality of their account credentials. GoldBrick uses world-class encryption, but security is a partnership; we advise all users to use unique passwords.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                   <div className="size-2 bg-primary rounded-full" /> 3. Referral & Growth
                </h2>
                <p className="text-white/60 font-medium leading-relaxed">
                  Our referral program is designed to reward community growth. Bonuses are applied automatically when a referred partner begins their investment journey, fostering a community of successful elite traders.
                </p>
              </section>

              <div className="pt-10 border-t border-border flex flex-col md:flex-row justify-between items-center text-white/40 font-mono text-[9px] font-black uppercase tracking-widest gap-4">
                <span>Last updated: May 2026</span>
                <span className="text-primary italic">GoldBrick Reserve Division</span>
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
