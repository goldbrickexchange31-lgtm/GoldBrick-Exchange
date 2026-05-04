import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Zap, ShieldCheck, Trophy, Crown, ArrowRight, Gauge, Cpu, Box, Gem, DollarSign } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  Timestamp,
  doc,
  updateDoc,
  increment,
  query,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

const PLAN_ICONS = [Zap, Cpu, Gauge, Box, Trophy, Gem, Crown, ShieldCheck];

export default function InvestPage() {
  const { userData } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen to Plans
    const unsub = onSnapshot(collection(db, 'plans'), (snap) => {
      const fsPlans = snap.docs.map((doc, index) => ({ 
        id: doc.id, 
        ...doc.data() as any,
        icon: PLAN_ICONS[index % PLAN_ICONS.length]
      })).sort((a: any, b: any) => (a.minDeposit || 0) - (b.minDeposit || 0));
      setPlans(fsPlans);
    });

    // Listen to Config
    const unsubConfig = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });

    return () => {
      unsub();
      unsubConfig();
    };
  }, []);

  const handleInvest = async () => {
    if (!userData) return;
    if (!selectedPlan) return toast.error('Please select a mining tier');
    
    const val = parseFloat(amount);
    if (isNaN(val) || val < (selectedPlan.minDeposit || 0) || val > (selectedPlan.maxDeposit || Infinity)) {
      return toast.error(`Amount must be between $${selectedPlan.minDeposit?.toLocaleString()} and $${selectedPlan.maxDeposit?.toLocaleString()}`);
    }
    
    if ((userData.balance || 0) < val) {
      return toast.error(`Insufficient credits. Please top up your wallet.`);
    }

    if (loading) return;

    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Calculate expiresAt based on flexible duration
      const expiresAt = new Date();
      let durationLabel = '';
      
      if (selectedPlan.durationDays) {
        expiresAt.setDate(expiresAt.getDate() + selectedPlan.durationDays);
        durationLabel = `${selectedPlan.durationDays} Days`;
      } else if (selectedPlan.durationHours) {
        expiresAt.setHours(expiresAt.getHours() + selectedPlan.durationHours);
        durationLabel = `${selectedPlan.durationHours} Hours`;
      } else {
        expiresAt.setDate(expiresAt.getDate() + 1); // Default to 1 day
        durationLabel = '1 Day';
      }

      // Profit Calculation
      let profit = 0;
      const profitValue = selectedPlan.profitValue || selectedPlan.dailyROI || selectedPlan.roi || 0;
      const minDeposit = selectedPlan.minDeposit || 1;
      
      if (selectedPlan.profitType === 'fixed') {
        // Profit increase per investment unit (relative to min deposit)
        // If min is $1000 and profit is $20000, then $2000 investment gets $40000 profit.
        profit = (val / minDeposit) * profitValue;
      } else {
        // Profit is calculated as percentage of investment for the duration
        profit = (val * profitValue / 100);
      }
      
      const expectedReturn = val + profit;

      const investmentRef = doc(collection(db, 'investments'));
      const investmentData = {
        userId: userData.uid,
        userName: userData.displayName || 'Investor',
        userEmail: userData.email,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: val,
        minDeposit: minDeposit,
        profit: profit,
        profitValue: profitValue,
        profitType: selectedPlan.profitType || 'percentage',
        expectedReturn: expectedReturn,
        status: 'active',
        durationDays: selectedPlan.durationDays || 0,
        durationHours: selectedPlan.durationHours || 0,
        expiresAt: Timestamp.fromDate(expiresAt),
        createdAt: serverTimestamp()
      };

      // Create investment record
      batch.set(investmentRef, investmentData);

      // Referral Bonus Logic (Only on first ever investment)
      if ((userData.totalInvested || 0) === 0 && userData.referredBy) {
        const bonusAmount = config?.referralBonus || 200;
        const referrersQuery = query(collection(db, 'users'), where('referralCode', '==', userData.referredBy));
        const referrerSnap = await getDocs(referrersQuery);
        
        if (!referrerSnap.empty) {
          const referrerId = referrerSnap.docs[0].id;
          batch.update(doc(db, 'users', referrerId), {
            balance: increment(bonusAmount),
            referralEarnings: increment(bonusAmount)
          });
          
          // Add a transaction record for the referrer
          const refTxRef = doc(collection(db, 'transactions'));
          batch.set(refTxRef, {
            userId: referrerId,
            userName: referrerSnap.docs[0].data().displayName || 'Referrer',
            userEmail: referrerSnap.docs[0].data().email,
            amount: bonusAmount,
            type: 'referral_bonus',
            status: 'approved',
            description: `Referral bonus from ${userData.displayName}`,
            createdAt: serverTimestamp()
          });
        }
      }

      // Finalize User Update
      batch.update(doc(db, 'users', userData.uid), {
        balance: increment(-val),
        totalInvested: increment(val)
      });

      // Create Transaction Record for history
      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        userId: userData.uid,
        userName: userData.displayName,
        userEmail: userData.email,
        amount: val,
        type: 'investment',
        status: 'approved',
        description: `Staked in ${selectedPlan.name}`,
        createdAt: serverTimestamp()
      });

      await batch.commit()
        .catch(e => handleFirestoreError(e, OperationType.WRITE, 'Atomic Investment Batch'));

      toast.success(`Mining session engaged in ${selectedPlan.name}!`);
      navigate('/dashboard');
    } catch (e: any) {
      toast.error(e.message || 'Deployment sequence failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-12">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase gold-text leading-tight">Invest Money</h1>
          <p className="text-zinc-500 font-mono text-[9px] md:text-[10px] uppercase tracking-widest">Select an investment plan to start earning</p>
        </header>

        {plans.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-900 border-dashed rounded-[2rem] p-20 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest">
            Awaiting investment plan availability from admin...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`group cursor-pointer transition-all border-zinc-900 overflow-hidden relative rounded-3xl ${selectedPlan?.id === plan.id ? 'ring-2 ring-primary bg-zinc-900 scale-[1.02]' : 'bg-[#080808] hover:bg-zinc-900/50'}`}
                onClick={() => { setSelectedPlan(plan); setAmount(plan.minDeposit.toString()); }}
              >
                <div className={`h-1.5 transition-all duration-500 ${selectedPlan?.id === plan.id ? 'bg-primary' : 'bg-zinc-900 group-hover:bg-primary/30'}`} />
                <CardHeader className="p-6 pb-2">
                   <div className={`size-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:rotate-6 ${selectedPlan?.id === plan.id ? 'bg-primary text-black' : 'bg-zinc-900 text-primary border border-zinc-800 shadow-xl'}`}>
                      <plan.icon className="size-6" />
                   </div>
                   <CardTitle className="text-xl font-black italic uppercase tracking-tighter group-hover:text-primary transition-colors">{plan.name}</CardTitle>
                   <CardDescription className="text-primary font-black text-sm uppercase">
                      {plan.profitType === 'fixed' ? `$${plan.profitValue} Fixed` : `${plan.profitValue || plan.dailyROI || 0}%`} 
                      {plan.durationHours ? ' Hourly' : ' Daily'} Yield
                   </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                   <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest space-y-3">
                      <div className="flex justify-between border-b border-zinc-900/50 pb-2"><span>Min Entry:</span> <span className="text-white font-black">${plan.minDeposit?.toLocaleString()}</span></div>
                      <div className="flex justify-between border-b border-zinc-900/50 pb-2"><span>Cap Limit:</span> <span className="text-white font-black">${plan.maxDeposit?.toLocaleString()}</span></div>
                      <div className="flex justify-between border-b border-zinc-900/50 pb-2"><span>Duration:</span> <span className="text-white font-black">{plan.durationDays ? `${plan.durationDays} DAYS` : `${plan.durationHours || 0} HOURS`}</span></div>
                   </div>
                   <div className="pt-2">
                      <Button 
                        variant={selectedPlan?.id === plan.id ? 'default' : 'outline'} 
                        className={`w-full font-black uppercase text-[10px] rounded-xl h-10 tracking-[0.2em] transition-all ${selectedPlan?.id === plan.id ? 'bg-primary text-black gold-glow' : 'border-zinc-800 text-zinc-500 hover:text-white'}`}
                      >
                        {selectedPlan?.id === plan.id ? 'SELECTED' : 'SELECT PLAN'}
                      </Button>
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedPlan && (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-[#080808] border-primary/20 shadow-2xl gold-glow rounded-[2.5rem] overflow-hidden border-t-4 border-t-primary">
              <CardHeader className="bg-zinc-900/20 p-6 md:p-8 border-b border-zinc-900">
                <CardTitle className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase gold-text">Invest in {selectedPlan.name}</CardTitle>
                <CardDescription className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold mt-2">Enter the amount you want to invest</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 md:space-y-8 p-6 md:p-10">
                <div className="space-y-3">
                   <div className="flex justify-between items-end">
                     <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Amount to Invest ($)</Label>
                     <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase">YOUR BALANCE: ${userData?.balance?.toLocaleString()}</span>
                   </div>
                   <div className="relative">
                     <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 size-8 text-primary/30" />
                     <Input 
                       type="number" 
                       placeholder={`$${selectedPlan.minDeposit} - $${selectedPlan.maxDeposit}`}
                       className="bg-[#0c0c0c] border-zinc-900 h-16 md:h-20 text-2xl md:text-4xl font-black font-mono text-primary pl-14 md:pl-16 rounded-2xl md:rounded-[1.5rem] focus:ring-1 focus:ring-primary/20"
                       value={amount}
                       onChange={(e) => setAmount(e.target.value)}
                     />
                   </div>
                </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="bg-zinc-950/50 rounded-2xl p-4 md:p-6 border border-zinc-900 flex flex-col justify-center">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total Profit</span>
                    <span className="text-2xl md:text-3xl font-black text-green-500 font-mono tracking-tighter">
                      +${(parseFloat(amount) ? (selectedPlan.profitType === 'fixed' ? (parseFloat(amount) / (selectedPlan.minDeposit || 1)) * (selectedPlan.profitValue || 0) : (parseFloat(amount) * (selectedPlan.profitValue || selectedPlan.dailyROI || 0) / 100)) : 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-green-500/50 font-bold mt-1">
                      ({selectedPlan.profitType === 'fixed' ? 'FIXED RATE' : `${selectedPlan.profitValue || selectedPlan.dailyROI || 0}% RETURN`})
                    </span>
                  </div>
                  <div className="bg-zinc-950/50 rounded-2xl p-4 md:p-6 border border-zinc-900 flex flex-col justify-center">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total Return</span>
                    <span className="text-2xl md:text-3xl font-black text-white font-mono tracking-tighter">
                      ${(parseFloat(amount) ? (parseFloat(amount) + (selectedPlan.profitType === 'fixed' ? (parseFloat(amount) / (selectedPlan.minDeposit || 1)) * (selectedPlan.profitValue || 0) : (parseFloat(amount) * (selectedPlan.profitValue || selectedPlan.dailyROI || 0) / 100))) : 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold mt-1 uppercase italic tracking-tighter leading-none">After {selectedPlan.durationDays ? `${selectedPlan.durationDays} Days` : `${selectedPlan.durationHours || 0} Hours`}</span>
                  </div>
                </div>

                <Button 
                  onClick={handleInvest} 
                  disabled={loading}
                  className="w-full h-16 bg-primary text-black font-black text-lg uppercase tracking-widest rounded-2xl gold-glow hover:scale-[1.01] transition-all"
                >
                  {loading ? 'Processing...' : 'Invest Now'}
                </Button>
                <div className="flex items-center gap-4 text-[10px] text-center text-zinc-600 font-medium px-4">
                  <ShieldCheck className="size-8 text-primary/30" />
                  <p className="leading-relaxed">
                    BY COMMITTING, YOU BIND YOUR CAPITAL TO THE {selectedPlan.name?.toUpperCase()} BLOCKCHAIN CLUSTER. 
                    TRANSACTIONS ARE TERMINAL AND INSURED VIA GOLDBRICK RESERVE POOLS.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
