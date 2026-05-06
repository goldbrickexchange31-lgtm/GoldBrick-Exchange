import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { ShieldAlert } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

const ADMIN_EMAILS = ['goldbrickexchange31@gmail.com'];

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ADMIN_EMAILS.includes(email)) {
      toast.error('Unauthorized access attempt');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Admin access granted');
      navigate('/admin');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl rounded-[2.5rem] overflow-hidden border">
        <CardHeader className="text-center pt-10 bg-white/5 border-b border-border">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
            <ShieldAlert className="text-red-500 w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-black italic vibrant-text uppercase tracking-tighter">ADMIN PORTAL</CardTitle>
          <p className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-2">Secure authorization required</p>
        </CardHeader>
        <CardContent className="p-10 pt-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Restricted Email</Label>
              <Input 
                type="email" 
                placeholder="Admin Email" 
                className="bg-background border-border h-14 rounded-2xl px-6 text-white focus:ring-1 focus:ring-primary/40 font-bold placeholder:text-white/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Security Password</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                className="bg-background border-border h-14 rounded-2xl px-6 text-white focus:ring-1 focus:ring-primary/40 font-bold placeholder:text-white/20"
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
              {loading ? 'Authorizing...' : 'Access Command Center'}
            </Button>
          </form>
          <div className="mt-8 text-center">
             <Link to="/" className="text-white/40 hover:text-white text-[10px] uppercase font-black tracking-widest transition-colors">Back to Main Site</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
