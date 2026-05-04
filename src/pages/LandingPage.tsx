import { Logo } from '../components/Logo';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Trophy, ShieldCheck, Zap, Users, ArrowRight, Star } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden">
      {/* Navbar */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto border-b border-white/10">
        <Link to="/">
          <Logo className="h-8 md:h-9" />
        </Link>
        <div className="hidden md:flex gap-8 text-sm font-medium">
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#testimonials" className="hover:text-primary transition-colors">Testimonials</a>
          <a href="#about" className="hover:text-primary transition-colors">About</a>
        </div>
        <div className="flex gap-4">
          <Link to="/login"><Button variant="ghost" className="text-white hover:text-primary">Login</Button></Link>
          <Link to="/register"><Button className="bg-primary text-black hover:bg-accent font-bold">Get Started</Button></Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-6 flex flex-col items-center text-center max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-3 py-1">
            <Trophy className="w-3 h-3 mr-2" />
            Voted #1 Multi-Asset Investment Platform 2024
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
            Financial Freedom, <br />
            <span className="gold-text">Made Simple.</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            Experience the world's most transparent and secure trading platform. 
            Smart automated returns, global asset management, and elite 24/7 support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-primary text-black hover:bg-accent font-bold px-8 h-14 text-lg w-full sm:w-auto">
                Start Investing Now <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-gray-500 justify-center">
              <ShieldCheck className="text-green-500 w-5 h-5" />
              <span>100% Payout Guarantee</span>
            </div>
          </div>
        </motion.div>

        {/* Floating Decals */}
        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-[120px] rounded-full -z-10" />
        <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-[120px] rounded-full -z-10" />
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/5 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Verified Investors', value: '1.2M+' },
            { label: 'Global Assets', value: '$2.4B+' },
            { label: 'Success Rate', value: '99.9%' },
            { label: 'Reliability', value: '100.0%' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold gold-text mb-1">{stat.value}</div>
              <div className="text-gray-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 italic uppercase tracking-tighter gold-text">Superior Investment Infrastructure</h2>
          <p className="text-gray-500 font-medium">GoldBrick offers industry-leading tools for elite wealth management.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Trophy, title: 'Smart Growth', desc: 'Watch your wealth compound with professional trading algorithms updated every 8 hours.' },
            { icon: Zap, title: 'Elite Liquidity', desc: 'Instant access to your funds with lightning-fast withdrawals via premium crypto gateways.' },
            { icon: ShieldCheck, title: 'Global Security', desc: 'Your assets are protected by world-class encryption and regulated vaulting services.' }
          ].map((feature, i) => (
            <Card key={i} className="bg-white/5 border-white/10 hover:border-primary/50 transition-all cursor-default">
              <CardContent className="pt-8 text-white">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="text-primary w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400">
                  {feature.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Investor Success Stories</h2>
            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-primary text-primary" />)}
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Michael Chen', state: 'New York', quote: 'GoldBrick has completely changed my passive income strategy. The 8-hour returns are insane.' },
              { name: 'Sarah Miller', state: 'California', quote: 'Setup was effortless. I deposited Bitcoin and saw profit in less than a day. Highly recommended.' },
              { name: 'David Wilson', state: 'Texas', quote: 'The most reliable platform out there. Payouts are always on time and support is amazing.' }
            ].map((t, i) => (
              <Card key={i} className="bg-black border-white/10 p-6 text-white">
                <p className="italic text-gray-300 mb-6 font-medium">"{t.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center font-bold text-primary">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="font-bold">{t.name}</div>
                    <div className="text-xs text-primary">{t.state}, USA</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 px-6 text-center max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold mb-6 italic uppercase tracking-tighter gold-text">Ready to experience the best?</h2>
        <p className="text-gray-400 mb-10 text-lg">Join 1.2M+ visionary investors who choose GoldBrick for elite trading and security.</p>
        <Link to="/register">
          <Button size="lg" className="bg-primary text-black hover:bg-accent font-black uppercase px-12 h-16 text-xl gold-glow rounded-3xl">
            Create Free Account
          </Button>
        </Link>
        <div className="mt-8 flex items-center justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all">
          <ShieldCheck className="w-8 h-8" />
          <Users className="w-8 h-8" />
          <Trophy className="w-8 h-8" />
        </div>
      </section>

      {/* Admin Hidden Button */}
      <div className="fixed bottom-4 right-4 opacity-5 hover:opacity-100 transition-opacity">
        <Link to="/admin/login" className="text-[10px] text-gray-800">Admin</Link>
      </div>

      <footer className="py-12 border-t border-white/10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/">
            <Logo className="h-9 opacity-80 hover:opacity-100 transition-all grayscale hover:grayscale-0" />
          </Link>
          <div className="text-gray-500 text-sm">© 2024 GoldBrick Exchange. All rights reserved. Registered in USA.</div>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-primary">Terms</a>
            <a href="#" className="hover:text-primary">Privacy</a>
            <a href="#" className="hover:text-primary">Legal</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
