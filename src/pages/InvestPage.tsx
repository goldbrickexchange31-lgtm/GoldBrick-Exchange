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
        <header className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase vibrant-text leading-tight flex items-center gap-4">
             <Gem className="text-primary size-8 md:size-12" /> Capital Deployment
          </h1>
          <p className="text-white/40 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em]">Select an elite mining tier to initiate your wealth generation sequence.</p>
        </header>

        {plans.length === 0 ? (
          <div className="bg-white/5 border border-border border-dashed rounded-[3rem] p-24 text-center text-white/40 font-black uppercase text-xs tracking-[0.4em] shadow-inner">
            Awaiting Command: No active mining tiers detected...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`group cursor-pointer transition-all border-border overflow-hidden relative rounded-[2.5rem] shadow-xl border ${selectedPlan?.id === plan.id ? 'ring-2 ring-primary bg-primary/10 scale-[1.02]' : 'bg-card hover:bg-white/5 hover:shadow-2xl hover:-translate-y-1'}`}
                onClick={() => { setSelectedPlan(plan); setAmount(plan.minDeposit.toString()); }}
              >
                <div className={`h-2 transition-all duration-700 ${selectedPlan?.id === plan.id ? 'bg-primary' : 'bg-white/5 group-hover:bg-primary/40'}`} />
                <CardHeader className="p-8 pb-4">
                   <div className={`size-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:rotate-12 ${selectedPlan?.id === plan.id ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20' : 'bg-white/5 text-primary border border-white/10'}`}>
                      <plan.icon className="size-8" />
                   </div>
                   <CardTitle className="text-2xl font-black italic uppercase tracking-tighter group-hover:text-primary transition-colors text-white leading-tight">{plan.name}</CardTitle>
                   <CardDescription className="text-primary font-black text-[10px] uppercase tracking-widest mt-2">
                      <span className="bg-primary/10 px-2 py-1 rounded-md">
                        {plan.profitType === 'fixed' ? `$${plan.profitValue?.toLocaleString()} Fixed` : `${plan.profitValue || plan.dailyROI || 0}%`} 
                        {plan.durationHours ? ' Hourly' : ' Daily'} Yield
                      </span>
                   </CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                   <div className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] space-y-4">
                      <div className="flex justify-between border-b border-white/5 pb-3"><span>Entry Min</span> <span className="text-white font-black font-mono italic">${plan.minDeposit?.toLocaleString()}</span></div>
                      <div className="flex justify-between border-b border-white/5 pb-3"><span>Asset Cap</span> <span className="text-white font-black font-mono italic">${plan.maxDeposit?.toLocaleString()}</span></div>
                      <div className="flex justify-between border-b border-white/5 pb-3"><span>Cycle</span> <span className="text-white font-black font-mono italic">{plan.durationDays ? `${plan.durationDays} DAYS` : `${plan.durationHours || 0} HOURS`}</span></div>
                   </div>
                   <div className="pt-2">
                      <Button 
                        variant={selectedPlan?.id === plan.id ? 'default' : 'outline'} 
                        className={`w-full font-black uppercase text-[10px] rounded-2xl h-12 tracking-[0.3em] transition-all border-2 ${selectedPlan?.id === plan.id ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20 border-primary' : 'border-white/5 text-slate-300 hover:text-white hover:border-primary/20'}`}
                      >
                        {selectedPlan?.id === plan.id ? 'STAKING ENABLED' : 'SELECT TIER'}
                      </Button>
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedPlan && (
          <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-10 duration-700">
            <Card className="bg-card border-border shadow-2xl rounded-[3.5rem] overflow-hidden border-t-8 border-t-primary border">
              <CardHeader className="bg-white/5 p-10 md:p-14 border-b border-border">
                <CardTitle className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase vibrant-text leading-tight">Stake in {selectedPlan.name}</CardTitle>
                <CardDescription className="text-white/40 font-bold text-[10px] uppercase tracking-[0.3em] mt-4">Confirm your deployment volume</CardDescription>
              </CardHeader>
              <CardContent className="space-y-10 p-10 md:p-14">
                <div className="space-y-4">
                   <div className="flex justify-between items-end px-2">
                     <Label className="text-[10px] text-white/40 font-black uppercase tracking-widest">Investment Volume (USD)</Label>
                     <span className="text-[10px] text-white/60 font-mono font-bold uppercase tracking-widest">Liquid Cash: ${userData?.balance?.toLocaleString()}.00</span>
                   </div>
                   <div className="relative group">
                     <DollarSign className="absolute left-8 top-1/2 -translate-y-1/2 size-10 text-white/10 group-focus-within:text-primary transition-colors" />
                     <Input 
                       type="number" 
                       placeholder={`0.00`}
                       className="bg-background border-border h-20 md:h-24 text-3xl md:text-5xl font-black font-mono text-white pl-20 md:pl-24 rounded-[2rem] focus:ring-1 focus:ring-primary/20 shadow-inner border-2 italic tracking-tighter placeholder:text-white/5"
                       value={amount}
                       onChange={(e) => setAmount(e.target.value)}
                     />
                   </div>
                </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div className="bg-white/5 rounded-[2.5rem] p-8 border border-border flex flex-col justify-center shadow-sm">
                    <span className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 italic">Expected Bounty</span>
                    <span className="text-3xl md:text-4xl font-black text-green-500 font-mono tracking-tighter italic">
                      +${(parseFloat(amount) ? (selectedPlan.profitType === 'fixed' ? (parseFloat(amount) / (selectedPlan.minDeposit || 1)) * (selectedPlan.profitValue || 0) : (parseFloat(amount) * (selectedPlan.profitValue || selectedPlan.dailyROI || 0) / 100)) : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-green-500 font-black mt-2 uppercase italic tracking-widest flex items-center gap-2">
                       <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                       {selectedPlan.profitType === 'fixed' ? 'FIXED RESERVE RATE' : `${selectedPlan.profitValue || selectedPlan.dailyROI || 0}% SECURED RETURN`}
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-[2.5rem] p-8 border border-border flex flex-col justify-center shadow-sm">
                    <span className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 italic">Total Payout</span>
                    <span className="text-3xl md:text-4xl font-black text-white font-mono tracking-tighter italic">
                      ${(parseFloat(amount) ? (parseFloat(amount) + (selectedPlan.profitType === 'fixed' ? (parseFloat(amount) / (selectedPlan.minDeposit || 1)) * (selectedPlan.profitValue || 0) : (parseFloat(amount) * (selectedPlan.profitValue || selectedPlan.dailyROI || 0) / 100))) : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-white/30 font-black mt-2 uppercase italic tracking-widest leading-none">After {selectedPlan.durationDays ? `${selectedPlan.durationDays} Full Cycle` : `${selectedPlan.durationHours || 0} Hour Block`}</span>
                  </div>
                </div>

                <Button 
                  onClick={handleInvest} 
                  disabled={loading || !amount || parseFloat(amount) <= 0}
                  className="w-full h-16 md:h-20 bg-primary text-primary-foreground font-black text-xs md:text-base uppercase tracking-widest rounded-[1.5rem] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-primary/30 flex items-center justify-center"
                >
                  {loading ? 'DEPLOYING ASSETS...' : 'ENGAGE MINING CYCLE'}
                </Button>
                
                <div className="flex items-start gap-6 p-8 bg-white/5 border border-border rounded-[2rem] shadow-sm">
                  <ShieldCheck className="size-12 text-primary/20 shrink-0" />
                  <p className="text-[10px] text-white/40 leading-relaxed tracking-tight font-bold uppercase italic">
                    BY COMMITTING, YOU BIND YOUR CAPITAL TO THE {selectedPlan.name?.toUpperCase()} BLOCKCHAIN CLUSTER. 
                    TRANSACTIONS ARE TERMINAL AND INSURED VIA GOLDBRICK RESERVE POOLS. ASSETS ARE SECURED AGAINST LIQUIDITY SHOCKS.
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
