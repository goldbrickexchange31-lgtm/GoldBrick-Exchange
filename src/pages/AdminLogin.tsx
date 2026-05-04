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

const ADMIN_EMAILS = ['goldbrickexchange31@gmail.com', 'btechtools.ng@gmail.com'];

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
    <div className="min-h-screen bg-black flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black">
      <Card className="w-full max-w-md bg-zinc-950 border-zinc-900 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="text-red-500 w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold gold-text">ADMIN PORTAL</CardTitle>
          <p className="text-zinc-500 text-sm">Secure authorization required</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Restricted Email</Label>
              <Input 
                type="email" 
                placeholder="Admin Email" 
                className="bg-black border-zinc-800 text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Security Password</Label>
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
              className="w-full gold-gradient text-black font-bold h-12 hover:opacity-90"
              disabled={loading}
            >
              {loading ? 'Authorizing...' : 'Access Command Center'}
            </Button>
          </form>
          <div className="mt-6 text-center">
             <Link to="/" className="text-zinc-600 hover:text-zinc-400 text-sm">Back to Main Site</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
