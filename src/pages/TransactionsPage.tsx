import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { ArrowDownLeft, ArrowUpRight, History, ExternalLink } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { format } from 'date-fns';

export default function TransactionsPage() {
  const { userData } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!userData) return;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userData.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [userData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending': return 'bg-primary/10 text-primary border-primary/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-zinc-500/10 text-zinc-500';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-12">
        <header className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase vibrant-text flex items-center gap-4">
             <History className="text-primary size-8 md:size-12" /> Transaction Ledger
          </h1>
          <p className="text-white/40 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em]">Complete history of your financial deployments and extractions.</p>
        </header>

        <Card className="bg-card border-border rounded-[2.5rem] overflow-hidden shadow-2xl border">
           <CardContent className="p-0">
              <div className="overflow-x-auto no-scrollbar">
                 <Table>
                    <TableHeader className="bg-white/5 border-b border-border">
                       <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">Operation Type</TableHead>
                          <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">Volume (USD)</TableHead>
                          <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">Asset</TableHead>
                          <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">Audit Status</TableHead>
                          <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">Timestamp</TableHead>
                          <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em] text-right">Reference</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {transactions.length === 0 ? (
                          <TableRow>
                             <TableCell colSpan={6} className="h-64 text-center text-white/20 italic font-black uppercase text-xs tracking-[0.5em] border-none">
                                No records currently stored in the blockchain ledger.
                             </TableCell>
                          </TableRow>
                       ) : (
                          transactions.map((tx) => (
                             <TableRow key={tx.id} className="border-border hover:bg-white/5 transition-colors group">
                                <TableCell className="px-8 py-6">
                                   <div className="flex items-center gap-4">
                                      <div className={`size-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110 ${tx.type === 'deposit' || tx.type === 'investment' || tx.type === 'referral_bonus' ? 'bg-primary/5 text-primary border-primary/10 shadow-sm shadow-primary/5' : 'bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-sm shadow-orange-500/5'}`}>
                                         {tx.type === 'deposit' || tx.type === 'referral_bonus' || tx.type === 'investment' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                      </div>
                                      <span className="capitalize font-black text-white italic uppercase tracking-tighter text-sm">{tx.type}</span>
                                   </div>
                                </TableCell>
                                <TableCell className="px-8 py-6 font-black font-mono text-white text-lg tracking-tighter">
                                   ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="px-8 py-6">
                                   <Badge variant="outline" className="font-mono text-white/40 border-white/5 bg-white/5 px-3 font-bold uppercase text-[10px] tracking-widest h-6">
                                      {tx.currency || 'USD'}
                                   </Badge>
                                </TableCell>
                                <TableCell className="px-8 py-6">
                                   <Badge className={`uppercase text-[9px] font-black tracking-widest border-none px-3 h-6 shadow-sm ${getStatusColor(tx.status)}`}>
                                      {tx.status}
                                   </Badge>
                                </TableCell>
                                <TableCell className="px-8 py-6 text-white/40 font-mono font-bold text-[10px]">
                                   {tx.createdAt ? format(tx.createdAt.toDate(), 'MMM dd, yyyy HH:mm') : 'INITIALIZING...'}
                                </TableCell>
                                <TableCell className="px-8 py-6 text-right">
                                   {tx.txHash ? (
                                      <a 
                                        href={`https://etherscan.io/tx/${tx.txHash}`} 
                                        className="text-primary hover:text-white transition-colors inline-flex items-center gap-2 font-black text-[9px] uppercase tracking-widest border border-primary/20 hover:border-primary px-3 py-1.5 rounded-lg bg-primary/5"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                         <span className="hidden md:inline">Verify</span> <ExternalLink size={12} className="inline" />
                                      </a>
                                   ) : (
                                     <span className="text-white/20 font-mono text-xs italic">System Record</span>
                                   )}
                                </TableCell>
                             </TableRow>
                          ))
                       )}
                    </TableBody>
                 </Table>
              </div>
           </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
