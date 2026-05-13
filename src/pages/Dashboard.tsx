import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { 
  Wallet, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Clock, 
  ArrowUpRight, 
  Plus,
  RefreshCcw,
  Zap,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
  Activity,
  History,
  Download,
  Bell
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import BTCChart from '../components/BTCChart';
import { useAuth } from '../lib/AuthContext';
import { usePWA } from '../lib/PWAContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment,
  getDocs,
  Timestamp,
  writeBatch,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { IOSInstallGuide } from '../components/IOSInstallGuide';

export default function Dashboard() {
  const { user, userData } = useAuth();
  const { isInstallable, handleInstallClick, showIOSInstructions, setShowIOSInstructions } = usePWA();
  const [allInvestments, setAllInvestments] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [globalActivity, setGlobalActivity] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000); 
    return () => clearInterval(timer);
  }, []);

  const activeInvestments = React.useMemo(() => {
    return allInvestments.filter(i => {
      const inv = i as any;
      if (inv.status !== 'active') return false;
      if (inv.expiresAt) {
        try {
          const expiry = inv.expiresAt.toDate();
          return expiry > now;
        } catch (e) {
          return true;
        }
      }
      return true;
    });
  }, [allInvestments, now]);

  useEffect(() => {
    if (!userData) return;

    // Listen for investments
    const invQuery = query(
      collection(db, 'investments'),
      where('userId', '==', userData.uid)
    );

    const unsub = onSnapshot(invQuery, async (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllInvestments(data);
    });

    // Listen for user transactions
    const txQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userData.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
    );
    const unsubTx = onSnapshot(txQuery, (snap) => {
        setRecentTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
        unsub();
        unsubTx();
    };
  }, [userData]);

  useEffect(() => {
    // Simulated Global social proof
    const currencies = ['BTC', 'ETH', 'USDT', 'LTC'];
    const names = ['CryptoLover', 'GoldDigger', 'BullTrader', 'ZenMiner', 'AlphaEdge', 'BitcoinProphet', 'EthWhale'];
    const countries = ['🇺🇸', '🇬🇧', '🇨🇦', '🇦🇺', '🇩🇪', '🇳🇬', '🇿🇦', '🇧🇷', '🇯PN'];

    const generateFake = () => ({
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      type: Math.random() > 0.3 ? 'Deposit' : 'Withdrawal',
      amount: (Math.random() * 8000 + 1000).toFixed(2),
      currency: currencies[Math.floor(Math.random() * currencies.length)],
      user: names[Math.floor(Math.random() * names.length)] + '***' + Math.floor(Math.random() * 99),
      country: countries[Math.floor(Math.random() * countries.length)],
      time: 'JUST NOW'
    });

    setGlobalActivity(Array.from({ length: 8 }).map(generateFake));

    const interval = setInterval(() => {
      setGlobalActivity(prev => [generateFake(), ...prev.slice(0, 7)]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const calculateProgress = (expiresAt: any, createdAt: any) => {
    if (!expiresAt || !createdAt) return 0;
    try {
      const end = expiresAt.toDate().getTime();
      const start = createdAt.toDate().getTime();
      const now = Date.now();
      const total = end - start;
      if (total <= 0) return 100;
      const elapsed = now - start;
      const progress = (elapsed / total) * 100;
      return Math.min(100, Math.max(0, progress));
    } catch (e) {
      return 0;
    }
  };

  // Handle Auto-Settle Expired Investments - REMOVED: Handled by server-side cron to prevent blinking
  /*
  useEffect(() => {
    if (!user || allInvestments.length === 0 || !userData) return;

    const settleExpired = async () => {
      const expired = allInvestments.filter(inv => inv.status === 'active' && inv.expiresAt && inv.expiresAt.toDate() <= new Date());
      
      if (expired.length === 0) return;

      const batch = writeBatch(db);
      let totalProfitToUser = 0;
      let totalReturnToUser = 0;

      expired.forEach(inv => {
        const invRef = doc(db, 'investments', inv.id);
        batch.update(invRef, { status: 'completed', updatedAt: serverTimestamp() });
        totalProfitToUser += inv.profit || 0;
        totalReturnToUser += (inv.amount || 0) + (inv.profit || 0);
      });

      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, {
        balance: increment(totalReturnToUser),
        totalProfit: increment(totalProfitToUser)
      });

      try {
        await batch.commit();
        toast.success(`Successfully claimed returns from ${expired.length} matured investment(s)!`);
      } catch (error) {
        console.error("Auto-settle error:", error);
      }
    };

    settleExpired();
  }, [allInvestments, user, userData]);
  */

  const totalEarnings = React.useMemo(() => {
    const realized = (userData?.totalProfit || 0) + (userData?.referralEarnings || 0);
    const unrealized = allInvestments
      .filter(inv => inv.status === 'active')
      .reduce((sum, inv) => sum + (inv.profit || 0), 0);
    return realized + unrealized;
  }, [userData, allInvestments]);

  return (
    <DashboardLayout>
      <IOSInstallGuide 
        isOpen={showIOSInstructions} 
        onClose={() => setShowIOSInstructions(false)} 
      />
      <div className="space-y-10 pb-12">
        {/* Top Header Section */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
             <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase vibrant-text leading-none">Your Dashboard</h1>
             <p className="text-white/40 font-mono text-[9px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold">Welcome Back: {userData?.displayName?.toUpperCase()}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
             {isInstallable && (
               <Button 
                 onClick={handleInstallClick}
                 variant="outline" 
                 className="flex-1 md:flex-none border-primary/20 bg-primary/5 text-primary font-black uppercase text-[10px] tracking-widest h-10 md:h-12 px-4 md:px-6 rounded-xl hover:bg-primary/10 transition-all animate-pulse"
               >
                 <Download className="size-4 mr-2" /> Install App
               </Button>
             )}
             <Button onClick={() => navigate('/withdraw')} variant="outline" className="flex-1 md:flex-none border-border bg-secondary font-black uppercase text-[10px] tracking-widest h-10 md:h-12 px-4 md:px-6 rounded-xl text-secondary-foreground hover:bg-secondary/80 transition-all">
               Withdraw
             </Button>
             <Button onClick={() => navigate('/deposit')} className="flex-1 md:flex-none bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest h-10 md:h-12 px-6 md:px-8 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
               <Plus className="size-4 mr-1 md:mr-2" /> Top-Up
             </Button>
          </div>
        </section>

        {/* Primary Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card border-border rounded-[2rem] overflow-hidden group hover:border-primary/30 transition-all shadow-xl relative">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
              <Wallet className="size-16" />
            </div>
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">My Balance</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-3xl md:text-4xl font-black font-mono text-foreground tracking-tighter italic">${userData?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="flex items-center text-[10px] text-primary mt-4 font-black uppercase tracking-widest">
                <ShieldCheck className="size-3 mr-1" /> Safe & Secure
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border rounded-[2rem] overflow-hidden group hover:border-primary/30 transition-all shadow-xl">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-3xl md:text-4xl font-black font-mono vibrant-text tracking-tighter italic">${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="flex items-center text-[10px] text-green-600 mt-4 font-black uppercase tracking-widest">
                <TrendingUp className="size-3 mr-1" /> Total Profits
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border rounded-[2rem] overflow-hidden group hover:border-primary/30 transition-all shadow-xl">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Total Invested</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-3xl md:text-4xl font-black font-mono text-foreground tracking-tighter italic">${userData?.totalInvested?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="flex items-center text-[10px] text-primary mt-4 font-black uppercase tracking-widest">
                <Activity className="size-3 mr-1" /> Active Investments
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border rounded-[2rem] overflow-hidden group hover:border-primary/30 transition-all shadow-xl">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">My Plans</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-3xl md:text-4xl font-black font-mono text-foreground tracking-tighter italic">{activeInvestments.length}</div>
              <div className="flex items-center text-[10px] text-white/50 mt-4 font-black uppercase tracking-widest">
                <Zap className="size-3 mr-1" /> Active Now
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Charts and Progress */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <BTCChart />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2">
                <Clock className="text-primary size-5" /> Current Profits
              </h3>
              <Button onClick={() => navigate('/invest')} variant="ghost" size="sm" className="text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary/10">View More</Button>
            </div>

            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 no-scrollbar">
              {activeInvestments.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-white/5 border-dashed rounded-[2rem] bg-white/5 p-8 text-white/40 text-center uppercase font-black italic tracking-widest text-[10px]">
                   <Zap className="size-12 mb-4 opacity-10" />
                   <p className="leading-relaxed">You have no active investments</p>
                   <Button onClick={() => navigate('/invest')} className="mt-8 bg-primary text-white font-black rounded-xl h-10 px-6 hover:opacity-90 uppercase text-[10px]">Start Now</Button>
                </div>
              ) : (
                activeInvestments.map((inv) => (
                  <Card key={inv.id} className="bg-card border-border rounded-3xl overflow-hidden group hover:border-primary/20 transition-all shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1 italic">{inv.planName}</div>
                          <div className="text-xl font-black font-mono text-white tracking-tighter italic">${inv.amount?.toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Expected</div>
                          <div className="text-lg font-black text-green-600 font-mono tracking-tighter">+${inv.expectedReturn?.toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/40">
                          <span>Investment Progress</span>
                          <span className="text-primary">{formatDistanceToNow(inv.expiresAt.toDate(), { addSuffix: true }).toUpperCase()}</span>
                        </div>
                        <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                           <div 
                             className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/50 to-primary transition-all duration-1000" 
                             style={{ width: `${calculateProgress(inv.expiresAt, inv.createdAt)}%` }} 
                           />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Activity Logs */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2">
                        <RefreshCcw className="text-primary size-5 animate-spin-slow" /> Recent Payouts
                    </h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                        <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] text-green-500 font-black uppercase tracking-tighter italic">Live</span>
                    </div>
                </div>
                <Card className="bg-card border-border rounded-[2.5rem] overflow-hidden shadow-xl">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-white/5 text-white/40 text-[10px] uppercase font-black tracking-widest border-b border-border">
                                    <tr>
                                        <th className="px-6 py-5">User</th>
                                        <th className="px-6 py-5">Amount</th>
                                        <th className="px-6 py-5">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {globalActivity.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-white/5 transition-all group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{tx.country}</span>
                                                    <span className="text-white font-black italic tracking-tighter uppercase">{tx.user}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="space-y-0.5">
                                                    <div className={`font-black font-mono text-sm tracking-tighter ${tx.type === 'Deposit' ? 'text-primary' : 'text-orange-500'}`}>
                                                        {tx.type === 'Deposit' ? '+' : '-'}${tx.amount}
                                                    </div>
                                                    <div className="text-[9px] text-white/30 font-black uppercase font-mono">{tx.currency} • {tx.type}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-1 bg-green-500 rounded-full" />
                                                    <span className="text-green-500 text-[9px] font-black uppercase tracking-widest italic">PAID</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2">
                        <History className="text-primary size-5" /> My History
                    </h3>
                    <Button onClick={() => navigate('/transactions')} variant="ghost" size="sm" className="text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary/10">Full History <ChevronRight className="size-3 ml-1" /></Button>
                </div>
                <Card className="bg-card border-border rounded-[2.5rem] overflow-hidden shadow-xl">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-white/5 text-white/40 text-[10px] uppercase font-black tracking-widest border-b border-border">
                                    <tr>
                                        <th className="px-6 py-5">Type</th>
                                        <th className="px-6 py-5 text-right">Amount</th>
                                        <th className="px-6 py-5 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {recentTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-white/5 transition-all">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-8 rounded-lg flex items-center justify-center ${tx.type === 'deposit' ? 'bg-primary/10 text-primary' : tx.type === 'withdrawal' ? 'bg-orange-500/10 text-orange-500' : 'bg-primary/10 text-primary'}`}>
                                                        {tx.type === 'deposit' ? <ArrowUpRight className="size-4 rotate-180" /> : tx.type === 'withdrawal' ? <ArrowUpRight className="size-4" /> : <RefreshCcw className="size-4" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-white uppercase italic tracking-tighter leading-none mb-1">{tx.type}</div>
                                                        <div className="text-[9px] text-white/30 font-mono font-bold">{tx.createdAt ? formatDistanceToNow(tx.createdAt.toDate(), { addSuffix: true }).toUpperCase() : 'PENDING'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right font-black font-mono text-sm tracking-tighter text-white">
                                                ${tx.amount?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <Badge className={`uppercase text-[9px] font-black tracking-tighter italic border-none px-2 h-5 ${tx.status === 'approved' ? 'bg-green-500/10 text-green-500' : tx.status === 'pending' ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'}`}>
                                                    {tx.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {recentTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-20 text-center text-[10px] text-white/20 italic font-black uppercase tracking-[0.3em]">No history found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
