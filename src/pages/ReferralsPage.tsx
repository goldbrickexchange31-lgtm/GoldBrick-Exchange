import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Users, Copy, Gift, DollarSign, ArrowRight } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function ReferralsPage() {
  const { userData } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  
  const referralLink = `${window.location.origin}/register?ref=${userData?.referralCode}`;

  useEffect(() => {
    // Listen to Config
    const unsubConfig = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });

    if (!userData) return () => unsubConfig();
    const q = query(
      collection(db, 'users'),
      where('referredBy', '==', userData.referralCode)
    );

    const unsub = onSnapshot(q, (snap) => {
      setReferrals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      unsub();
      unsubConfig();
    };
  }, [userData]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-12">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
           <div className="space-y-3">
              <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase vibrant-text leading-tight flex items-center gap-4">
                 <Users className="text-primary size-8 md:size-12" /> Revenue Network
              </h1>
              <p className="text-white/40 font-bold text-[10px] md:text-xs uppercase tracking-widest leading-relaxed max-w-xl">
                Invite partners to the elite GoldBrick ecosystem and earn a secured <span className="text-primary font-black underline decoration-primary/30 underline-offset-4">${config?.referralBonus || 200}.00</span> payout for every active member verified.
              </p>
           </div>
           <Card className="bg-card border-border w-full lg:w-auto rounded-3xl shadow-xl overflow-hidden group hover:border-primary/30 transition-all border">
              <CardContent className="p-8 flex items-center gap-6">
                 <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                    <Gift className="text-primary size-8" />
                 </div>
                 <div>
                    <div className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-1">Network Earnings</div>
                    <div className="text-3xl font-black font-mono text-white tracking-tighter italic">${(userData as any)?.referralEarnings?.toLocaleString() || 0}.00</div>
                 </div>
              </CardContent>
           </Card>
        </div>

        <Card className="bg-card border-border shadow-2xl rounded-[3rem] overflow-hidden border-t-4 border-t-primary border">
           <CardHeader className="p-8 md:p-10 border-b border-border bg-white/5">
              <CardTitle className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white">Your Invitation Payload</CardTitle>
              <CardDescription className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-2 px-1">SHARE YOUR UNIQUE LINK TO ACTIVATE NETWORK BONUSES</CardDescription>
           </CardHeader>
           <CardContent className="space-y-10 p-8 md:p-10">
              <div className="flex flex-col md:flex-row gap-4">
                 <div className="flex-1 relative group">
                    <Copy className="absolute left-6 top-1/2 -translate-y-1/2 size-5 text-slate-300 group-focus-within:text-primary" />
                    <Input 
                      readOnly 
                      value={referralLink}
                      className="bg-background border-border h-16 md:h-20 font-mono text-white flex-1 pl-16 rounded-2xl text-[10px] md:text-sm font-bold shadow-inner focus:ring-1 focus:ring-primary/20"
                    />
                 </div>
                 <Button onClick={handleCopy} className="h-16 md:h-20 bg-primary text-primary-foreground font-black uppercase text-sm px-10 rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                    <Copy className="size-5 mr-3" /> COPY PAYLOAD
                 </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   { step: '01', title: 'Share Payload', desc: 'Distribute your unique mining link via secure channels.' },
                   { step: '02', title: 'Partner Engagement', desc: 'Contact registers and initiates a mining session.' },
                   { step: '03', title: 'Instant Bounty', desc: `Claim your $${config?.referralBonus || 200} instantly into your active balance.` }
                 ].map((item, i) => (
                    <div key={i} className="p-8 bg-white/5 rounded-[2rem] border border-border space-y-4 hover:border-primary/20 transition-colors group">
                       <div className="text-primary font-black italic text-3xl opacity-20 group-hover:opacity-100 transition-opacity font-mono">{item.step}</div>
                       <div className="font-black text-white italic uppercase tracking-tighter text-xl">{item.title}</div>
                       <p className="text-[11px] text-white/40 font-bold uppercase tracking-wide leading-relaxed">{item.desc}</p>
                    </div>
                 ))}
              </div>
           </CardContent>
        </Card>

        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter vibrant-text">Active Network ({referrals.length})</h3>
              <Badge className="bg-primary/10 text-primary border-none font-black px-4 py-1.5 rounded-full uppercase text-[10px] tracking-widest">Real-time Data</Badge>
           </div>
           <Card className="bg-card border-border rounded-[2.5rem] overflow-hidden shadow-xl border">
              <CardContent className="p-0">
                 <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                       <thead className="bg-white/5 text-white/40 text-[10px] uppercase font-black tracking-[0.2em] border-b border-border">
                          <tr>
                             <th className="px-8 py-6 uppercase">Partner Profile</th>
                             <th className="px-8 py-6 uppercase text-center">Assets Engaged</th>
                             <th className="px-8 py-6 uppercase text-center">Audit Status</th>
                             <th className="px-8 py-6 uppercase text-right">Deployment Date</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-border">
                          {referrals.length === 0 ? (
                             <tr>
                                <td colSpan={4} className="px-8 py-24 text-center text-white/20 italic font-black uppercase text-xs tracking-[0.4em]">Zero active network nodes detected</td>
                             </tr>
                          ) : (
                             referrals.map(r => (
                                <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                                   <td className="px-8 py-6">
                                      <div className="flex items-center gap-4">
                                         <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center font-black italic text-primary border border-white/10">
                                            {r.displayName?.charAt(0).toUpperCase()}
                                         </div>
                                         <span className="font-black text-white italic uppercase tracking-tighter text-sm">{r.displayName}</span>
                                      </div>
                                   </td>
                                   <td className="px-8 py-6 text-center">
                                      <span className="font-mono text-white font-extrabold text-sm">${r.totalInvested?.toLocaleString() || '0.00'}</span>
                                   </td>
                                   <td className="px-8 py-6 text-center">
                                      <Badge className={`uppercase text-[9px] font-black tracking-widest border-none px-3 h-6 ${r.totalInvested > 0 ? 'bg-green-500/10 text-green-500 shadow-sm shadow-green-500/10' : 'bg-white/5 text-white/20'}`}>
                                         {r.totalInvested > 0 ? 'Active node' : 'Standby'}
                                      </Badge>
                                   </td>
                                   <td className="px-8 py-6 text-right text-white/40 font-mono font-bold text-[10px]">
                                      {r.createdAt ? new Date(r.createdAt.toDate()).toLocaleDateString() : 'INITIALIZING...'}
                                   </td>
                                </tr>
                             ))
                          )}
                       </tbody>
                    </table>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
