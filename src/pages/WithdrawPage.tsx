import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ShieldAlert, ArrowUpRight, HelpCircle, DollarSign, Wallet } from 'lucide-react';
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
      <div className="max-w-2xl mx-auto space-y-10 pb-12">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase gold-text leading-tight">Withdraw Funds</h1>
          <p className="text-zinc-500 font-mono text-[9px] md:text-[10px] uppercase tracking-widest font-bold">Get your money out safely</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <Card className="bg-[#080808] border-zinc-900 border-dashed rounded-2xl">
              <CardContent className="p-6 text-center">
                 <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Min Deposit</div>
                 <div className="text-xl font-black font-mono text-white">${config?.minWithdrawal?.toLocaleString() || 100}</div>
              </CardContent>
           </Card>
           <Card className="bg-[#080808] border-zinc-900 border-dashed rounded-2xl">
              <CardContent className="p-6 text-center">
                 <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Fee</div>
                 <div className="text-xl font-black font-mono text-white">
                   {config?.withdrawalFeeType === 'fixed' ? `$${config?.withdrawalFee}` : `${config?.withdrawalFee}%`}
                 </div>
              </CardContent>
           </Card>
           <Card className="bg-[#080808] border-zinc-900 border-dashed rounded-2xl">
              <CardContent className="p-6 text-center">
                 <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Security</div>
                 <div className="text-xl font-black font-mono flex items-center justify-center gap-1 text-primary">SAFE <ShieldAlert className="size-4" /></div>
              </CardContent>
           </Card>
        </div>

        <Card className="bg-[#080808] border-primary/20 shadow-2xl gold-glow rounded-[2.5rem] overflow-hidden border-t-4 border-t-primary">
           <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
              <CardTitle className="text-2xl font-black italic uppercase tracking-tighter gold-text">Withdrawal Request</CardTitle>
              <CardDescription className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold mt-1">Please check your details carefully</CardDescription>
           </CardHeader>
           <CardContent className="space-y-8 p-10">
              <div className="space-y-6">
                 <div className="space-y-3">
                    <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Select Crypto</Label>
                    <div className="grid grid-cols-3 gap-3">
                       {['BTC', 'ETH', 'USDT'].map(c => (
                         <Button 
                           key={c} 
                           variant="outline" 
                           onClick={() => setCurrency(c)}
                           className={`h-12 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest ${currency === c ? 'bg-primary/10 border-primary text-primary' : 'bg-black border-zinc-900 text-zinc-500 hover:text-white'}`}
                         >
                           {c}
                         </Button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-3">
                    <div className="flex justify-between items-end">
                       <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Amount to Withdraw ($)</Label>
                       <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase">Your Balance: ${userData?.balance?.toLocaleString()}</span>
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 size-8 text-primary/30" />
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        className="bg-[#0c0c0c] border-[#1a1a1a] h-16 md:h-20 text-2xl md:text-4xl font-black font-mono text-primary pl-14 md:pl-16 rounded-2xl md:rounded-[1.5rem] placeholder:text-zinc-900"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Your {currency} Address</Label>
                    <div className="relative">
                      <Wallet className="absolute left-6 top-1/2 -translate-y-1/2 size-5 text-primary/30" />
                      <Input 
                        placeholder={`Paste your ${currency} address here`} 
                        className="bg-[#0c0c0c] border-[#1a1a1a] h-14 pl-14 rounded-xl font-mono text-sm text-zinc-300 placeholder:text-zinc-800"
                        value={wallet}
                        onChange={(e) => setWallet(e.target.value)}
                      />
                    </div>
                 </div>
              </div>

              <div className="bg-zinc-950/50 p-8 rounded-3xl border border-zinc-900 space-y-4">
                 <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-widest">
                    <span className="text-zinc-500">Gross Amount</span>
                    <span className="text-white font-black">${(parseFloat(amount) || 0).toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-widest">
                    <span className="text-zinc-500">Processing Fee</span>
                    <span className="text-red-500 font-black">-${fee.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center border-t border-zinc-900 pt-5 mt-2">
                    <span className="text-xs text-white font-black uppercase italic tracking-tighter">You will receive</span>
                    <span className="text-2xl md:text-3xl font-black text-green-500 font-mono tracking-tighter">${netPayout.toLocaleString()}</span>
                 </div>
              </div>

              <Button 
                onClick={handleWithdraw} 
                disabled={loading || !amount || !wallet}
                className="w-full h-16 bg-primary text-black font-black text-lg uppercase tracking-widest rounded-2xl gold-glow hover:scale-[1.01] transition-all"
              >
                {loading ? 'Processing...' : 'Withdraw Now'}
              </Button>
              
              <div className="flex items-start gap-4 p-5 bg-zinc-900/30 border border-zinc-900 rounded-2xl">
                 <HelpCircle className="size-8 text-primary/30 shrink-0 mt-1" />
                 <p className="text-[10px] text-zinc-500 leading-relaxed tracking-tight font-medium">
                    Withdrawals are processed manually. Please allow up to 24 hours for your funds to arrive. 
                    Make sure your wallet address is correct. If you use a wrong address, your money will be lost.
                 </p>
              </div>
           </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
