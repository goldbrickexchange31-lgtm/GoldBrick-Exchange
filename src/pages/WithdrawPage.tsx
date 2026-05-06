import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ShieldAlert, ArrowUpRight, HelpCircle, DollarSign, Wallet, ArrowUpCircle, Lock, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { 
  collection, 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  increment,
  writeBatch
} from 'firebase/firestore';

export default function WithdrawPage() {
  const { userData } = useAuth();
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState('');
  const [currency, setCurrency] = useState('BTC');
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
      else setConfig({ minWithdrawal: 100, maxWithdrawal: 50000, withdrawalFee: 10, withdrawalFeeType: 'percentage' });
    });
    return () => unsub();
  }, []);

  const calculateFee = () => {
    if (!config) return 0;
    const val = parseFloat(amount) || 0;
    if (config.withdrawalFeeType === 'fixed') {
      return config.withdrawalFee || 0;
    } else {
      return (val * (config.withdrawalFee || 0) / 100);
    }
  };

  const handleWithdraw = async () => {
    if (!userData || !config) return;
    const val = parseFloat(amount);

    if (isNaN(val) || val < (config.minWithdrawal || 0) || val > (config.maxWithdrawal || Infinity)) {
      return toast.error(`Amount must be between $${config.minWithdrawal?.toLocaleString()} and $${config.maxWithdrawal?.toLocaleString()}`);
    }
    
    if ((userData.balance || 0) < val) {
      return toast.error('You do not have enough money in your balance');
    }
    
    if (!wallet || wallet.length < 10) {
      return toast.error('Please enter a valid wallet address');
    }

    setLoading(true);
    try {
      const fee = calculateFee();
      const netAmount = val - fee;

      if (netAmount <= 0) {
        setLoading(false);
        return toast.error('Amount is too small to cover fees');
      }

      const batch = writeBatch(db);
      
      // Deduct from balance
      const userRef = doc(db, 'users', userData.uid);
      batch.update(userRef, {
        balance: increment(-val)
      });

      // Create withdrawal request
      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        userId: userData.uid,
        userName: userData.displayName || 'User',
        userEmail: userData.email,
        type: 'withdrawal',
        amount: val,
        fee: fee,
        netAmount: netAmount,
        currency: currency,
        walletAddress: wallet,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      await batch.commit()
        .catch(e => handleFirestoreError(e, OperationType.WRITE, 'Withdrawal Batch'));

      toast.success('Withdrawal request sent! Waiting for approval.');
      navigate('/transactions');
    } catch (e: any) {
      toast.error('Withdrawal failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fee = calculateFee();
  const netPayout = Math.max(0, (parseFloat(amount) || 0) - fee);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-12 pb-12">
        <header className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase vibrant-text leading-tight flex items-center gap-4">
             <ArrowUpCircle className="text-primary size-8 md:size-12" /> Liquidate Assets
          </h1>
          <p className="text-white/40 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em]">Convert your mining yields into external liquidity.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-card border-border shadow-2xl rounded-[3.5rem] overflow-hidden border-t-8 border-t-primary border">
              <CardContent className="p-10 md:p-14 space-y-10">
                <div className="space-y-4">
                   <div className="flex justify-between items-end px-2">
                     <Label className="text-[10px] text-white/40 font-black uppercase tracking-widest">Withdrawal Volume (USD)</Label>
                     <span className="text-[10px] text-white/60 font-mono font-bold uppercase tracking-widest italic">AVAILABLE: ${userData?.balance?.toLocaleString()}.00</span>
                   </div>
                   <div className="relative group">
                     <DollarSign className="absolute left-8 top-1/2 -translate-y-1/2 size-10 text-white/10 group-focus-within:text-primary transition-colors" />
                     <Input 
                       type="number" 
                       placeholder="0.00"
                       className="bg-background border-border h-20 md:h-24 text-3xl md:text-5xl font-black font-mono text-white pl-20 md:pl-24 rounded-[2rem] focus:ring-1 focus:ring-primary/20 shadow-inner border-2 italic tracking-tighter placeholder:text-white/5"
                       value={amount}
                       onChange={(e) => setAmount(e.target.value)}
                     />
                   </div>
                </div>

                <div className="space-y-4">
                   <Label className="text-[10px] text-white/40 font-black uppercase tracking-widest px-2">Select Currency Platform</Label>
                   <div className="grid grid-cols-3 gap-4">
                      {['BTC', 'ETH', 'USDT'].map(c => (
                         <div 
                           key={c}
                           onClick={() => setCurrency(c)}
                           className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group ${currency === c ? 'border-primary bg-primary/5 shadow-lg' : 'border-white/5 bg-card hover:border-primary/20'}`}
                         >
                            <span className={`text-lg font-black italic tracking-tighter ${currency === c ? 'text-primary' : 'text-white/40'}`}>{c}</span>
                            {currency === c && <div className="size-2 bg-primary rounded-full animate-pulse" />}
                         </div>
                      ))}
                   </div>
                </div>

                <div className="space-y-4">
                   <Label className="text-[10px] text-white/40 font-black uppercase tracking-widest px-2">Destination Address ({currency})</Label>
                   <div className="relative group">
                      <Wallet className="absolute left-6 top-1/2 -translate-y-1/2 size-6 text-white/20 group-focus-within:text-primary transition-colors" />
                      <Input 
                        placeholder={`Paste your ${currency} wallet address here`}
                        className="bg-card border-border h-16 text-sm font-bold font-mono text-white pl-16 rounded-2xl focus:ring-1 focus:ring-primary/20 shadow-inner border-2 italic transition-all"
                        value={wallet}
                        onChange={(e) => setWallet(e.target.value)}
                      />
                   </div>
                </div>

                <Button 
                  className="w-full h-16 md:h-20 bg-primary text-primary-foreground font-black text-[10px] md:text-base uppercase tracking-widest rounded-[1.5rem] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-primary/30 flex items-center justify-center"
                  onClick={handleWithdraw}
                  disabled={loading || !amount || !wallet}
                >
                  {loading ? 'PROCESSING LIQUIDATION...' : 'EXECUTE WITHDRAWAL'}
                </Button>
              </CardContent>
            </Card>

            <div className="flex items-start gap-6 p-8 bg-white/5 border border-border rounded-[2.5rem] shadow-sm">
                <ShieldCheck className="size-12 text-primary/20 shrink-0" />
                <p className="text-[10px] text-white/40 leading-relaxed tracking-tight font-bold uppercase italic">
                  WITHDRAWAL PROTOCOL: FUNDS ARE TRANSFERRED VIA GOLDBRICK LIQUIDITY NODES. THE SYSTEM AUTOMATICALLY AUDITS EVERY TRANSACTION FOR SECURITY COMPLIANCE. 
                  INCORRECT WALLET ADDRESSES MAY RESULT IN PERMANENT ASSET IONIZATION.
                </p>
            </div>
          </div>

          <div className="space-y-8">
            <Card className="bg-card border-border shadow-xl rounded-[2.5rem] border-t-4 border-t-primary border">
              <CardHeader className="p-8 pb-2">
                <CardTitle className="text-xl font-black italic uppercase tracking-tighter text-white">Transaction Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-6">
                <div className="space-y-4">
                   <div className="flex justify-between items-center py-3 border-b border-white/5">
                      <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Gross Amount</span>
                      <span className="text-sm font-black text-white font-mono italic">${(parseFloat(amount) || 0).toLocaleString()}.00</span>
                   </div>
                   <div className="flex justify-between items-center py-3 border-b border-white/5">
                      <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Protocol Fee ({config?.withdrawalFeeType === 'fixed' ? 'FIXED' : `${config?.withdrawalFee}%`})</span>
                      <span className="text-sm font-black text-red-500 font-mono italic">-${fee.toLocaleString()}</span>
                   </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 border border-border space-y-2 flex flex-col justify-center">
                    <span className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1 italic">Net Payout</span>
                    <span className="text-3xl font-black text-white font-mono tracking-tighter italic">${netPayout.toLocaleString()}</span>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="text-[10px] text-primary font-black uppercase italic tracking-widest">Target Account Reached</span>
                       <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                   <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Min Entry</span>
                      <span className="text-[11px] text-white font-black italic tracking-tighter font-mono">${config?.minWithdrawal || 100}</span>
                   </div>
                   <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Processing</span>
                      <span className="text-[11px] text-primary font-black italic tracking-tighter">INSTANT NODE</span>
                   </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-2xl rounded-[2.5rem] overflow-hidden group">
               <CardContent className="p-10 space-y-6">
                  <div className="size-16 bg-primary/20 rounded-[1.5rem] flex items-center justify-center transition-transform group-hover:rotate-12 duration-700">
                     <Lock className="text-primary size-8" />
                  </div>
                  <div className="space-y-2">
                     <h4 className="text-white font-black uppercase italic text-2xl tracking-tighter">Secure Vault</h4>
                     <p className="text-white/40 text-[10px] font-bold leading-relaxed uppercase tracking-widest italic">
                        Liquidations are secured by multi-signature cold storage clusters.
                     </p>
                  </div>
               </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
