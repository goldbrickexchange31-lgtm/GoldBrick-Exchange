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
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-zinc-950 border-zinc-900">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <Link to="/">
              <Logo className="h-12" />
            </Link>
          </div>
          <CardTitle className="text-3xl font-black italic gold-text uppercase tracking-tighter">Start Investing</CardTitle>
          <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest mt-2 px-8">Join the elite GoldBrick investment community</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Full Name</Label>
              <Input 
                placeholder="John Doe" 
                className="bg-black border-zinc-800 text-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
            <div className="space-y-2">
              <Label className="text-zinc-400">Confirm Password</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                className="bg-black border-zinc-800 text-white"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Referral Code (Optional)</Label>
              <Input 
                placeholder="GOLDBRICK-XYZ" 
                className="bg-black border-zinc-800 text-white"
                value={manualReferralCode}
                onChange={(e) => setManualReferralCode(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2 py-2">
              <input 
                type="checkbox" 
                id="terms" 
                className="size-4 rounded border-zinc-800 bg-black text-primary transition-colors focus:ring-0"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <Label htmlFor="terms" className="text-xs text-zinc-400 cursor-pointer">
                I agree to the <Link to="/terms" className="text-primary hover:underline">Terms and Conditions</Link>
              </Label>
            </div>
            <Button 
              type="submit" 
              className="w-full gold-gradient text-black font-bold h-12"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-zinc-500">Already a member? </span>
            <Link to="/login" className="text-primary hover:underline font-bold">Sign In</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
