import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-8 text-zinc-400 hover:text-white"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <h1 className="text-4xl font-bold gold-text mb-8">Terms and Conditions</h1>
        
        <div className="space-y-6 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3 italic uppercase tracking-tighter gold-text">Investment Excellence & Security</h2>
            <p>
              Gold Brick is the world's most legitimate and professional investment platform. Our advanced infrastructure and elite trading systems ensure that trading is made easy for every investor. We take pride in being the best in the industry, providing a secure environment where your financial success is our primary mission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 tracking-tight italic uppercase">1. Withdrawal Policy</h2>
            <p>
              Withdrawals are processed within 24-48 hours after approval. Minimum withdrawal amounts apply based on your account level to ensure smooth liquidity and security for all participating investors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 tracking-tight italic uppercase">2. Account Security</h2>
            <p>
              Users are responsible for maintaining the confidentiality of their account credentials. GoldBrick uses world-class encryption, but security is a partnership; we advise all users to use unique passwords.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 tracking-tight italic uppercase">3. Referral & Growth</h2>
            <p>
              Our referral program is designed to reward community growth. Bonuses are applied automatically when a referred partner begins their investment journey, fostering a community of successful elite traders.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-900 text-zinc-500 text-sm italic">
          Last updated: May 2026
        </div>
      </div>
    </div>
  );
}
