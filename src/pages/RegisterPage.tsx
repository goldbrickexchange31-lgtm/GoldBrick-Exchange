import { Logo } from '../components/Logo';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export default function RegisterPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [manualReferralCode, setManualReferralCode] = useState('');
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const ref = params.get('ref');
    if (ref) {
      setManualReferralCode(ref.toUpperCase());
    }
  }, [params]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error('Please agree to the Terms and Conditions');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      // Generate random referral code
      const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const referredBy = manualReferralCode || params.get('ref') || null;

      // Create user doc
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: name,
        balance: 0,
        totalProfit: 0,
        totalInvested: 0,
        referralEarnings: 0,
        referralCode: myReferralCode,
        referredBy: referredBy,
        role: 'user',
        status: 'active',
        createdAt: serverTimestamp()
      }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`));

      toast.success('Account created successfully');
      navigate('/dashboard');
    } catch (error: any) {
      try {
        const info = JSON.parse(error.message);
        toast.error(`Permission Denied: ${info.error}`);
      } catch {
        toast.error(error.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 py-20">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="text-center pt-10 pb-2">
          <div className="flex justify-center mb-8">
            <Link to="/">
              <Logo className="h-12" />
            </Link>
          </div>
          <CardTitle className="text-4xl font-black italic vibrant-text uppercase tracking-tighter">Start Investing</CardTitle>
          <p className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-3 px-8 leading-relaxed">Join the elite GoldBrick investment community</p>
        </CardHeader>
        <CardContent className="p-10 pt-6">
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Full Name</Label>
              <Input 
                placeholder="John Doe" 
                className="bg-background border-border h-14 rounded-2xl px-6 text-white focus:ring-1 focus:ring-primary/40 font-bold"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Password</Label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="bg-background border-border h-14 rounded-2xl px-4 text-white focus:ring-1 focus:ring-primary/40 font-bold"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Confirm</Label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="bg-background border-border h-14 rounded-2xl px-4 text-white focus:ring-1 focus:ring-primary/40 font-bold"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Referral Code (Optional)</Label>
              <Input 
                placeholder="GOLDBRICK-XYZ" 
                className="bg-background border-border h-14 rounded-2xl px-6 text-white focus:ring-1 focus:ring-primary/40 font-bold font-mono"
                value={manualReferralCode}
                onChange={(e) => setManualReferralCode(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-3 py-2">
              <input 
                type="checkbox" 
                id="terms" 
                className="size-5 rounded-lg border-border bg-background text-primary transition-all focus:ring-0 checked:bg-primary"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <Label htmlFor="terms" className="text-[10px] font-black text-white/40 cursor-pointer uppercase tracking-widest">
                I agree to the <Link to="/terms" className="text-primary hover:underline transition-all">Terms and Conditions</Link>
              </Label>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground font-black h-16 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all uppercase text-sm"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up Now'}
            </Button>
          </form>
          <div className="mt-8 text-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-white/40">Already a member? </span>
            <Link to="/login" className="text-primary hover:underline transition-all">Sign In</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
