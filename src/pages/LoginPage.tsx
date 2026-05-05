import { Logo } from '../components/Logo';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back to GoldBrick');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="text-center pt-10 pb-2">
          <div className="flex justify-center mb-8">
            <Link to="/">
              <Logo className="h-12" />
            </Link>
          </div>
          <CardTitle className="text-4xl font-black italic vibrant-text uppercase tracking-tighter">Welcome Back</CardTitle>
          <p className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-3 px-8 leading-relaxed">Sign in to your GoldBrick account</p>
        </CardHeader>
        <CardContent className="p-10 pt-6">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Email Address</Label>
              <Input 
                type="email" 
                placeholder="email@example.com" 
                className="bg-background border-border h-14 rounded-2xl px-6 text-white focus:ring-1 focus:ring-primary/40 font-bold"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Password</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                className="bg-background border-border h-14 rounded-2xl px-6 text-white focus:ring-1 focus:ring-primary/40 font-bold"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground font-black h-16 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all uppercase text-sm"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In Now'}
            </Button>
          </form>
          <div className="mt-8 text-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-white/40">New to GoldBrick? </span>
            <Link to="/register" className="text-primary hover:underline transition-all">Create Account</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
