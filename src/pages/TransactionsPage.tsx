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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
             <History className="text-primary" /> Transaction Log
          </h1>
          <p className="text-zinc-500">Complete history of your financial activity.</p>
        </div>

        <Card className="bg-zinc-950 border-zinc-900 overflow-hidden">
           <CardContent className="p-0 overflow-x-auto">
              <Table>
                 <TableHeader className="bg-zinc-900/50">
                    <TableRow className="border-zinc-900 hover:bg-transparent">
                       <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Type</TableHead>
                       <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Amount</TableHead>
                       <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Currency</TableHead>
                       <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Status</TableHead>
                       <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Date</TableHead>
                       <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest text-right">Action</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {transactions.length === 0 ? (
                       <TableRow>
                          <TableCell colSpan={6} className="h-40 text-center text-zinc-500 border-zinc-900">
                             No transactions found. Your activity will appear here.
                          </TableCell>
                       </TableRow>
                    ) : (
                       transactions.map((tx) => (
                          <TableRow key={tx.id} className="border-zinc-900 hover:bg-zinc-900/30 transition-colors">
                             <TableCell>
                                <div className="flex items-center gap-3">
                                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                      {tx.type === 'deposit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                   </div>
                                   <span className="capitalize font-medium text-zinc-300">{tx.type}</span>
                                </div>
                             </TableCell>
                             <TableCell className="font-bold text-white">
                                ${tx.amount.toLocaleString()}
                             </TableCell>
                             <TableCell className="font-mono text-zinc-400">
                                {tx.currency}
                             </TableCell>
                             <TableCell>
                                <Badge className={getStatusColor(tx.status)}>
                                   {tx.status}
                                </Badge>
                             </TableCell>
                             <TableCell className="text-zinc-500">
                                {tx.createdAt ? format(tx.createdAt.toDate(), 'MMM dd, yyyy HH:mm') : 'Refining...'}
                             </TableCell>
                             <TableCell className="text-right">
                                {tx.txHash && (
                                   <a 
                                     href={`#`} 
                                     className="text-primary hover:text-white transition-colors"
                                     target="_blank"
                                     rel="noopener noreferrer"
                                   >
                                      <ExternalLink size={16} className="inline" />
                                   </a>
                                )}
                             </TableCell>
                          </TableRow>
                       ))
                    )}
                 </TableBody>
              </Table>
           </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
