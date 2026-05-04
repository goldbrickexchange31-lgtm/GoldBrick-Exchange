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
      <div className="space-y-8">
        <div className="flex flex-col md:row items-center justify-between gap-6">
           <div className="space-y-2">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                 <Users className="text-primary" /> Multi-Tier Referral
              </h1>
              <p className="text-zinc-500">Invite friends and earn a fixed ${config?.referralBonus || 200} bonus for every new active miner.</p>
           </div>
           <Card className="bg-primary/10 border-primary/20 w-full md:w-auto">
              <CardContent className="p-4 flex items-center gap-4">
                 <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <Gift className="text-primary w-5 h-5" />
                 </div>
                 <div>
                    <div className="text-[10px] text-zinc-400 font-bold uppercase">Total Referral Earnings</div>
                    <div className="text-2xl font-black gold-text">${(userData as any)?.referralEarnings?.toLocaleString() || 0}</div>
                 </div>
              </CardContent>
           </Card>
        </div>

        <Card className="bg-zinc-950 border-primary/30 shadow-2xl shadow-primary/5">
           <CardHeader>
              <CardTitle className="gold-text italic uppercase font-black tracking-tighter">Your Invitation Link</CardTitle>
              <CardDescription className="text-zinc-500 font-bold">Share this link to start earning mining bonuses today.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-3">
                 <Input 
                   readOnly 
                   value={referralLink}
                   className="bg-[#0c0c0c] border-[#1a1a1a] h-14 font-mono text-primary flex-1 px-4 text-xs"
                 />
                 <Button onClick={handleCopy} className="h-14 bg-primary text-black font-black uppercase text-xs px-8 gold-glow">
                    <Copy className="w-5 h-5 mr-1" /> Copy Link
                 </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                 <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800/50 space-y-2">
                    <div className="text-primary font-black italic text-lg uppercase">Step 1</div>
                    <div className="font-black text-white italic uppercase tracking-tighter">Share Link</div>
                    <p className="text-xs text-zinc-500 font-medium">Post on social media or send to friends directly.</p>
                 </div>
                 <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800/50 space-y-2">
                    <div className="text-primary font-black italic text-lg uppercase">Step 2</div>
                    <div className="font-black text-white italic uppercase tracking-tighter">Partner Invests</div>
                    <p className="text-xs text-zinc-500 font-medium">They register and start their first mining session.</p>
                 </div>
                 <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800/50 space-y-2">
                    <div className="text-primary font-black italic text-lg uppercase">Step 3</div>
                    <div className="font-black text-white italic uppercase tracking-tighter">Claim ${config?.referralBonus || 200}</div>
                    <p className="text-xs text-zinc-500 font-medium">The bonus is instantly credited to your available balance.</p>
                 </div>
              </div>
           </CardContent>
        </Card>

        <div className="space-y-4">
           <h3 className="text-xl font-black italic uppercase tracking-tighter gold-text">Your Referrals ({referrals.length})</h3>
           <Card className="bg-zinc-950 border-zinc-900 overflow-hidden shadow-inner">
              <CardContent className="p-0">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                       <thead className="bg-zinc-900 text-zinc-400 text-[10px] uppercase font-black tracking-widest">
                          <tr>
                             <th className="px-6 py-5">User</th>
                             <th className="px-6 py-5">Total Invested</th>
                             <th className="px-6 py-5">Status</th>
                             <th className="px-6 py-5">Joined</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-zinc-900">
                          {referrals.length === 0 ? (
                             <tr>
                                <td colSpan={4} className="px-6 py-16 text-center text-zinc-700 italic font-black uppercase text-[10px] tracking-widest">No referrals yet. Start sharing to grow your team!</td>
                             </tr>
                          ) : (
                             referrals.map(r => (
                                <tr key={r.id} className="hover:bg-zinc-900/30 transition-colors">
                                   <td className="px-6 py-4 font-black text-white italic uppercase tracking-tighter">{r.displayName}</td>
                                   <td className="px-6 py-4 font-mono text-zinc-300 font-black">${r.totalInvested?.toLocaleString() || 0}</td>
                                   <td className="px-6 py-4">
                                      <Badge className={r.totalInvested > 0 ? 'bg-green-500/10 text-green-500 border-none px-2 font-black uppercase text-[9px]' : 'bg-zinc-500/10 text-zinc-600 border-none px-2 font-black uppercase text-[9px]'}>
                                         {r.totalInvested > 0 ? 'Active' : 'Unactive'}
                                      </Badge>
                                   </td>
                                   <td className="px-6 py-4 text-zinc-400 font-medium">
                                      {r.createdAt ? new Date(r.createdAt.toDate()).toLocaleDateString() : 'Just now'}
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
