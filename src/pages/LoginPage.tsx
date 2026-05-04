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
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-zinc-950 border-zinc-900">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <Link to="/">
              <Logo className="h-12" />
            </Link>
          </div>
          <CardTitle className="text-3xl font-black italic gold-text uppercase tracking-tighter">Welcome Back</CardTitle>
          <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest mt-2 px-8">Sign in to your GoldBrick account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Email Address</Label>
              <Input 
                type="email" 
                placeholder="email@example.com" 
                className="bg-black border-zinc-800 text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Password</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                className="bg-black border-zinc-800 text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full gold-gradient text-black font-bold h-12"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-zinc-500">New to GoldBrick? </span>
            <Link to="/register" className="text-primary hover:underline font-bold">Create Account</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
