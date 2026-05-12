import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { 
  Users, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Settings, 
  Plus, 
  Trash2, 
  Check, 
  X,
  CreditCard,
  BarChart2,
  DollarSign,
  QrCode,
  LayoutDashboard,
  Eye,
  Edit2,
  Search,
  MessageSquare,
  ShieldAlert,
  Wallet,
  Globe,
  Menu,
  ChevronRight,
  TrendingUp,
  Activity,
  History,
  Share2,
  ExternalLink,
  LogOut,
  Send
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { requestNotificationPermission, onForegroundMessage } from '../lib/notifications';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment,
  deleteDoc,
  setDoc,
  addDoc,
  serverTimestamp,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

type Section = 'overview' | 'users' | 'investment' | 'deposit' | 'withdrawal' | 'chat' | 'settings' | 'wallets';

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({
    minWithdrawal: 100,
    maxWithdrawal: 50000,
    referralBonus: 200,
    withdrawalFee: 10,
    withdrawalFeeType: 'percentage',
    whatsappLink: '',
    supportEmail: '',
    contactLink: '',
    depositInstruction: 'Send funds to the wallet below and upload a clear screenshot of your transaction receipt.',
  });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<any>(null);
  const [walletForm, setWalletForm] = useState({
    currency: '',
    network: '',
    address: '',
    qrCodeUrl: ''
  });

  useEffect(() => {
    if (editingWallet) {
      setWalletForm({
        currency: editingWallet.currency || '',
        network: editingWallet.network || '',
        address: editingWallet.address || '',
        qrCodeUrl: editingWallet.qrCodeUrl || ''
      });
    } else {
      setWalletForm({
        currency: '',
        network: '',
        address: '',
        qrCodeUrl: ''
      });
    }
  }, [editingWallet, isWalletModalOpen]);

  useEffect(() => {
    const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'users'));

    const unsubTx = onSnapshot(query(collection(db, 'transactions'), orderBy('createdAt', 'desc')), (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'transactions'));

    const unsubPlans = onSnapshot(collection(db, 'plans'), (snap) => {
      const sortedPlans = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
        .sort((a, b) => (a.minDeposit || 0) - (b.minDeposit || 0));
      setPlans(sortedPlans);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'plans'));

    const unsubWallets = onSnapshot(collection(db, 'wallets'), (snap) => {
      setWallets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'wallets'));

    const unsubConfig = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    }, (e) => handleFirestoreError(e, OperationType.GET, 'config/general'));

    // Notification Setup
    let unsubscribeForeground: () => void = () => {};
    try {
      if (auth.currentUser) {
        requestNotificationPermission(auth.currentUser.uid).catch(console.error);
        unsubscribeForeground = onForegroundMessage();
      }
    } catch (e) {
      console.error("Notification setup failed", e);
    }

    setLoading(false);
    return () => {
      unsubUsers();
      unsubTx();
      unsubPlans();
      unsubWallets();
      unsubConfig();
      if (unsubscribeForeground) unsubscribeForeground();
    };
  }, []);

  const handleApproveTransaction = async (tx: any) => {
    try {
      const txRef = doc(db, 'transactions', tx.id);
      const userRef = doc(db, 'users', tx.userId);

      if (tx.type === 'deposit') {
        await updateDoc(userRef, {
          balance: increment(tx.amount)
        });
        toast.success(`Deposit Approved! $${tx.amount} added to user.`);
      } else {
        toast.success(`Withdrawal marked as approved.`);
      }

      await updateDoc(txRef, { 
        status: 'approved',
        updatedAt: serverTimestamp() 
      });
      
      setIsReceiptOpen(false);
    } catch (e: any) {
      toast.error('Could not approve. Please check permissions.');
    }
  };

  const handleRejectTransaction = async (tx: any) => {
    try {
      const txRef = doc(db, 'transactions', tx.id);
      if (tx.type === 'withdrawal') {
        const userRef = doc(db, 'users', tx.userId);
        await updateDoc(userRef, { balance: increment(tx.amount) });
      }
      await updateDoc(txRef, { 
        status: 'rejected',
        updatedAt: serverTimestamp()
      });
      toast.info('Transaction rejected.');
      setIsReceiptOpen(false);
    } catch (e: any) {
      toast.error('Could not reject.');
    }
  };

  const handleUpdateConfig = async () => {
    try {
      await setDoc(doc(db, 'config', 'general'), {
        ...config,
        updatedAt: serverTimestamp()
      });
      toast.success('Settings updated');
    } catch (e: any) {
      toast.error('Failed to update settings');
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const duration = parseInt(formData.get('duration') as string);
    const unit = formData.get('durationUnit') as string;
    
    const planData: any = {
      name: formData.get('name') as string,
      minDeposit: parseFloat(formData.get('minDeposit') as string),
      maxDeposit: parseFloat(formData.get('maxDeposit') as string),
      profitType: formData.get('profitType') as string,
      profitValue: parseFloat(formData.get('profitValue') as string),
    };

    if (unit === 'days') planData.durationDays = duration;
    else if (unit === 'hours') planData.durationHours = duration;

    // compatibility
    if (planData.profitType === 'percentage') {
      planData.dailyROI = planData.profitValue;
    } else {
      planData.dailyROI = 0;
    }

    try {
      if (editingPlan) {
        // Remove old duration fields
        const deleteFields: any = {};
        if (editingPlan.durationDays) deleteFields.durationDays = null;
        if (editingPlan.durationHours) deleteFields.durationHours = null;
        if (editingPlan.durationSeconds) deleteFields.durationSeconds = null;

        await updateDoc(doc(db, 'plans', editingPlan.id), {
          ...deleteFields,
          ...planData,
          updatedAt: serverTimestamp()
        });
        toast.success('Plan updated');
      } else {
        await addDoc(collection(db, 'plans'), {
          ...planData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success('Plan created');
      }
      setIsPlanModalOpen(false);
      setEditingPlan(null);
    } catch (e: any) {
      toast.error('Error saving plan');
    }
  };

  const handleSaveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    const walletData = {
      currency: walletForm.currency.toUpperCase(),
      symbol: walletForm.currency.toUpperCase(),
      address: walletForm.address,
      network: walletForm.network,
      qrCodeUrl: walletForm.qrCodeUrl,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingWallet) {
        await updateDoc(doc(db, 'wallets', editingWallet.id), walletData);
        toast.success('Wallet updated');
      } else {
        await addDoc(collection(db, 'wallets'), {
          ...walletData,
          createdAt: serverTimestamp()
        });
        toast.success('Wallet added');
      }
      setIsWalletModalOpen(false);
      setEditingWallet(null);
    } catch (e: any) {
      toast.error('Failed to save wallet');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error('File too large. Max 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (field === 'qrCodeUrl') {
        setWalletForm(prev => ({ ...prev, qrCodeUrl: base64String }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePlan = async (id: string) => {
    if (window.confirm('Delete this investment plan?')) {
      try {
        await deleteDoc(doc(db, 'plans', id));
        toast.success('Plan deleted successfully');
      } catch (e: any) {
        console.error("Delete error", e);
        toast.error(`Delete failed: ${e.message || 'Check permissions'}`);
      }
    }
  };

  const handleDeleteWallet = async (id: string) => {
    if (window.confirm('Remove this wallet address?')) {
      try {
        await deleteDoc(doc(db, 'wallets', id));
        toast.success('Wallet removed');
      } catch (e: any) {
        toast.error('Failed to remove wallet');
      }
    }
  };

  const handleModifyBalance = async (user: any) => {
    const amountStr = prompt(`Current Balance: $${user.balance}. Enter amount to ADD (use - to subtract):`);
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        balance: increment(amount)
      });
      toast.success(`User balance updated by $${amount}`);
    } catch (e: any) {
      toast.error('Error updating balance');
    }
  };

  const handleToggleUserStatus = async (user: any) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'users', user.id), { status: newStatus });
      toast.success(`User status updated to ${newStatus}`);
    } catch (e: any) {
      toast.error('Error updating status');
    }
  };

  const handleSystemReset = async () => {
    if (!window.confirm('WARNING: This will delete ALL users (except admins), all transactions, all investments, and all chats. This cannot be undone. Are you sure?')) {
      return;
    }
    
    if (!window.confirm('FINAL WARNING: Everything will be wiped. This is intended for site launch reset. Proceed?')) {
      return;
    }

    try {
      setLoading(true);
      const adminEmail = auth.currentUser?.email;
      
      // 1. Wipe collections
      const simpleCollections = ['investments', 'transactions'];
      for (const collName of simpleCollections) {
        const snap = await getDocs(collection(db, collName));
        for (const doc of snap.docs) {
          await deleteDoc(doc.ref);
        }
      }

      // 2. Wipe Chats
      const chatSnap = await getDocs(collection(db, 'chats'));
      for (const chatDoc of chatSnap.docs) {
        const msgSnap = await getDocs(collection(chatDoc.ref, 'messages'));
        for (const m of msgSnap.docs) {
          await deleteDoc(m.ref);
        }
        await deleteDoc(chatDoc.ref);
      }

      // 3. Wipe Users (except admins)
      const userSnap = await getDocs(collection(db, 'users'));
      for (const uDoc of userSnap.docs) {
        const data = uDoc.data();
        const isProtected = data.role === 'admin' || data.email === adminEmail || data.email === 'goldbrickexchange31@gmail.com';
        if (!isProtected) {
          await deleteDoc(uDoc.ref);
        } else {
           // Reset stats
           await updateDoc(uDoc.ref, {
             balance: 0,
             totalInvested: 0,
             totalProfit: 0,
             referralEarnings: 0
           });
        }
      }

      toast.success('System Reset Complete. Platform is now clean.');
      setActiveSection('overview');
    } catch (e: any) {
      console.error(e);
      toast.error(`Reset Failed: ${e.message}. Ensure you have deletion permissions in Firestore rules.`);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.referralCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'All Users', icon: Users },
    { id: 'investment', label: 'Investment Plans', icon: BarChart2 },
    { id: 'wallets', label: 'Wallets manager', icon: Wallet },
    { id: 'deposit', label: 'Deposits', icon: ArrowDownLeft, badge: transactions.filter(t => t.type === 'deposit' && t.status === 'pending').length },
    { id: 'withdrawal', label: 'Withdrawals', icon: ArrowUpRight, badge: transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length },
    { id: 'chat', label: 'Support Chat', icon: MessageSquare },
    { id: 'settings', label: 'Site Settings', icon: Settings },
  ];

  useEffect(() => {
    // Reset scroll when switching section
    const mainContent = document.querySelector('.overflow-y-auto');
    if (mainContent) mainContent.scrollTo(0, 0);
  }, [activeSection]);

  const handleTestNotification = async () => {
    if (!auth.currentUser) return;
    const toastId = toast.loading('Sending test notification...');
    try {
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          title: 'GOLDBRICK MASTER ALERT',
          body: 'Pixel-perfect push notification system is online and active! 🎖️'
        })
      });
      const data = await response.json();
      if (data.success && data.successCount > 0) {
        toast.success(`Success! Sent to ${data.successCount} registered devices.`, { id: toastId });
      } else {
        toast.error(`Failed: ${data.errorMessages?.[0] || 'No active tokens found. Please sync first.'}`, { id: toastId });
      }
    } catch (e) {
      toast.error('Connection failed. Is the server running?', { id: toastId });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      navigate('/');
    } catch (e) {
      toast.error('Logout failed');
    }
  };

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-white font-sans flex overflow-hidden">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-card border-r border-border z-50 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="p-8 border-b border-border">
          <h2 className="text-2xl font-black vibrant-text italic tracking-tighter uppercase flex items-center gap-2">
            Admin Panel
          </h2>
          <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">Status: Master Mode</p>
        </div>

        <nav className="p-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id as Section); setIsSidebarOpen(false); }}
              className={`
                w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all group
                ${activeSection === item.id ? 'bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20' : 'hover:bg-white/5 text-white/40'}
              `}
            >
              <div className="flex items-center gap-3">
                <item.icon className="size-5" />
                <span className="text-xs uppercase tracking-widest font-bold">{item.label}</span>
              </div>
              {item.badge ? (
                <span className={`text-[10px] px-2 py-0.5 rounded-md ${activeSection === item.id ? 'bg-white text-primary' : 'bg-primary text-primary-foreground'} font-black`}>
                  {item.badge}
                </span>
              ) : (
                <ChevronRight className={`size-4 opacity-0 group-hover:opacity-100 transition-opacity ${activeSection === item.id ? 'hidden' : ''}`} />
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border space-y-2">
            <Link to="/dashboard" className="block w-full">
               <Button variant="ghost" className="w-full text-white/40 hover:text-primary uppercase text-[10px] font-black tracking-widest justify-start rounded-xl">
                 <LayoutDashboard className="mr-2 size-3" /> Dashboard
               </Button>
            </Link>
            <Button onClick={handleLogout} variant="ghost" className="w-full text-white/40 hover:text-red-500 hover:bg-red-500/10 uppercase text-[10px] font-black tracking-widest justify-start rounded-xl">
              <LogOut className="mr-2 size-3" /> Logout
            </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 border-b border-border bg-card flex items-center justify-between px-6 lg:px-10 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-400"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-black italic vibrant-text uppercase tracking-tighter">
              {sidebarItems.find(i => i.id === activeSection)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-border">
                <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">System Active</span>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 no-scrollbar">
          {/* Overview */}
          {activeSection === 'overview' && (
            <div className="space-y-10">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 {[
                   { label: 'Total Users', val: users.length, icon: Users, color: 'text-primary', bgColor: 'bg-primary/5' },
                   { label: 'Pending Deposits', val: transactions.filter(t => t.type === 'deposit' && t.status === 'pending').length, icon: ArrowDownLeft, color: 'text-primary', bgColor: 'bg-primary/10' },
                   { label: 'Pending Payouts', val: transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length, icon: ArrowUpRight, color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
                   { label: 'Profit Today', val: '$0.00', icon: BarChart2, color: 'text-green-600', bgColor: 'bg-green-500/10' }
                 ].map((stat, i) => (
                    <Card key={i} className="bg-card border-border rounded-3xl group transition-all hover:border-primary/20 shadow-sm border">
                       <CardContent className="p-8 flex items-center justify-between">
                          <div className="space-y-1">
                             <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{stat.label}</p>
                             <h3 className="text-3xl font-black italic text-white tracking-tighter">{stat.val}</h3>
                          </div>
                          <div className={`p-4 rounded-2xl ${stat.bgColor} border border-transparent ${stat.color} group-hover:scale-110 transition-transform`}>
                             <stat.icon className="size-6" />
                          </div>
                       </CardContent>
                    </Card>
                 ))}
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="lg:col-span-2 bg-card border-border rounded-3xl overflow-hidden shadow-md">
                     <CardHeader className="bg-white/5 p-6 border-b border-border flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-black italic uppercase tracking-tighter text-white">Recent Activities</CardTitle>
                          <CardDescription className="text-[10px] uppercase font-bold text-white/40 font-mono">Latest network updates</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setActiveSection('deposit')} className="text-xs text-primary font-black uppercase tracking-widest hover:bg-primary/10">Manage All</Button>
                     </CardHeader>
                     <CardContent className="p-0">
                        <div className="divide-y divide-border">
                           {transactions.slice(0, 10).map(tx => (
                             <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer" onClick={() => { setSelectedTx(tx); setIsReceiptOpen(true); }}>
                                <div className="flex items-center gap-4">
                                   <div className={`size-10 rounded-xl flex items-center justify-center ${tx.type === 'deposit' ? 'bg-primary/5 text-primary' : 'bg-orange-500/10 text-orange-600'}`}>
                                      {tx.type === 'deposit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                   </div>
                                   <div>
                                      <p className="font-bold text-white uppercase italic tracking-tighter text-sm">{tx.userName}</p>
                                      <p className="text-[10px] text-white/40 font-mono italic">{format(tx.createdAt?.toDate() || new Date(), 'MMM dd, HH:mm')}</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className={`font-black italic text-lg ${tx.type === 'deposit' ? 'text-primary' : 'text-orange-600'}`}>${tx.amount?.toLocaleString()}</p>
                                   <Badge className={`text-[8px] font-black rounded-md border-none ${tx.status === 'pending' ? 'bg-primary text-primary-foreground' : tx.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                      {tx.status}
                                   </Badge>
                                </div>
                             </div>
                           ))}
                           {transactions.length === 0 && <div className="p-20 text-center text-slate-300 italic uppercase font-black text-xs">No records found</div>}
                        </div>
                     </CardContent>
                  </Card>

                  <Card className="bg-card border-border rounded-3xl overflow-hidden p-8 flex flex-col items-center justify-center text-center space-y-6 shadow-md">
                     <div className="size-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                        <Activity size={40} className="text-primary animate-pulse" />
                     </div>
                     <div className="space-y-1">
                        <h3 className="text-xl font-black italic vibrant-text uppercase underline decoration-primary/50 decoration-2 underline-offset-4">Security Log</h3>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest max-w-[200px] mt-2 leading-relaxed">Always verify screenshots before final approval</p>
                     </div>
                     <div className="w-full space-y-3 pt-4 border-t border-border">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                           <span>Daily Growth</span>
                           <span className="text-green-600 font-black">+ 15.2%</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                           <span>New Members</span>
                           <span className="text-white font-black">{users.filter(u => (Date.now() - (u.createdAt?.toDate() || 0)) < 86400000).length} Today</span>
                        </div>
                     </div>
                  </Card>
               </div>
            </div>
          )}

          {/* Users Section */}
          {activeSection === 'users' && (
            <div className="space-y-8">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/40" />
            <Input 
               placeholder="Search User by Name or Email..." 
               className="bg-background border-border h-14 pl-12 rounded-2xl focus:ring-1 focus:ring-primary/40 text-sm text-white placeholder:text-white/40 shadow-sm"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">{filteredUsers.length} TOTAL USERS</div>
      </div>

               <Card className="bg-card border-border rounded-3xl overflow-hidden shadow-md">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-border">
                           <tr>
                              <th className="p-6 text-[10px] font-black uppercase text-white/40">User Profile</th>
                              <th className="p-6 text-[10px] font-black uppercase text-white/40">Balance Status</th>
                              <th className="p-6 text-[10px] font-black uppercase text-white/40">Referral ID</th>
                              <th className="p-6 text-[10px] font-black uppercase text-white/40">Site Status</th>
                              <th className="p-6 text-right text-[10px] font-black uppercase text-white/40">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                           {filteredUsers.map(u => (
                             <tr key={u.id} className="hover:bg-white/5 transition-all group">
                                <td className="p-6">
                                   <div className="flex items-center gap-4">
                                      <div className="size-12 rounded-2xl bg-white/5 border border-border flex items-center justify-center font-black italic text-primary text-xl">
                                         {u.displayName?.[0]?.toUpperCase() || 'U'}
                                      </div>
                                      <div>
                                         <p className="font-black text-white italic text-base group-hover:text-primary transition-colors">{u.displayName}</p>
                                         <p className="text-[10px] text-white/40 font-mono tracking-tight font-bold italic">{u.email}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="p-6">
                                   <p className="text-xl font-black italic text-white font-mono">${u.balance?.toLocaleString() || '0'}</p>
                                   <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">Available Funds</p>
                                </td>
                                <td className="p-6">
                                   <p className="text-xs font-mono font-bold text-white/40 select-all">{u.referralCode || 'NONE'}</p>
                                </td>
                                <td className="p-6">
                                   <Badge className={`uppercase text-[9px] font-black px-2 py-0.5 rounded-md border-none ${u.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                      {u.status}
                                   </Badge>
                                </td>
                                <td className="p-6 text-right">
                                   <div className="flex items-center justify-end gap-3">
                                      <Button size="sm" variant="outline" className="h-10 border-border bg-background text-[10px] font-black uppercase rounded-xl hover:bg-white/5 text-white" onClick={() => handleModifyBalance(u)}>
                                         Set Balance
                                      </Button>
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className={`size-10 rounded-xl transition-all ${u.status === 'active' ? 'text-red-500 hover:bg-red-500/10' : 'text-green-500 hover:bg-green-500/10'}`}
                                        onClick={() => handleToggleUserStatus(u)}
                                      >
                                         <ShieldAlert size={20} />
                                      </Button>
                                   </div>
                                </td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </Card>
            </div>
          )}

          {/* Investment (Plans) Section */}
          {activeSection === 'investment' && (
            <div className="space-y-10">
               <div className="flex items-center justify-between">
                  <header>
                    <h2 className="text-3xl font-black italic vibrant-text tracking-tighter uppercase underline decoration-primary/50 decoration-4 underline-offset-8">Investment Plans</h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-4">Manage plans users can invest in</p>
                  </header>
                  <Button onClick={() => { setEditingPlan(null); setIsPlanModalOpen(true); }} className="bg-primary text-primary-foreground font-black uppercase text-xs h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                     <Plus className="mr-2 size-5" /> New Plan
                  </Button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {plans.map(plan => (
                      <Card key={plan.id} className="bg-card border-border rounded-[2.5rem] overflow-hidden group hover:border-primary/50 transition-all shadow-md relative border">
                        <div className="h-2 w-full bg-white/5 group-hover:bg-primary transition-all duration-700" />
                        <CardContent className="p-8">
                           <div className="flex justify-between items-start mb-8">
                              <div>
                                 <h3 className="text-2xl font-black italic uppercase tracking-tighter group-hover:text-primary transition-colors text-white">{plan.name}</h3>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">GOLDBRICK MASTER PLAN</p>
                              </div>
                           </div>

                           <div className="grid grid-cols-2 gap-4 font-mono">
                              <div className="p-4 bg-white/5 rounded-2xl border border-border">
                                 <p className="text-[8px] uppercase tracking-widest text-slate-400 mb-1">Yield / ROI</p>
                                 <p className="text-xl text-green-600 font-black italic">
                                   {plan.profitType === 'fixed' ? `$${plan.profitValue}` : `${plan.profitValue || plan.dailyROI || 0}%`}
                                 </p>
                              </div>
                              <div className="p-4 bg-white/5 rounded-2xl border border-border">
                                 <p className="text-[8px] uppercase tracking-widest text-slate-400 mb-1">Duration</p>
                                 <p className="text-xl text-white font-black italic">{plan.durationDays ? `${plan.durationDays}d` : `${plan.durationHours || 0}h`}</p>
                              </div>
                              <div className="p-4 bg-white/5 rounded-2xl border border-border col-span-2">
                                 <p className="text-[8px] uppercase tracking-widest text-slate-400 mb-1">Entry Amount</p>
                                 <p className="text-base text-white font-black italic">${plan.minDeposit?.toLocaleString()} - ${plan.maxDeposit?.toLocaleString()}</p>
                              </div>
                           </div>

                           <div className="mt-8 flex gap-3">
                              <Button 
                                className="flex-1 h-12 bg-background border border-border text-primary font-black uppercase text-[10px] rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all gap-2 shadow-sm" 
                                onClick={() => { setEditingPlan(plan); setIsPlanModalOpen(true); }}
                              >
                                 <Edit2 size={14} /> Edit Plan Settings
                              </Button>
                              <Button 
                                variant="ghost"
                                size="icon"
                                className="h-12 w-12 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-transparent hover:border-red-500"
                                onClick={() => handleDeletePlan(plan.id)}
                              >
                                 <Trash2 size={16} />
                              </Button>
                           </div>
                        </CardContent>
                     </Card>
                  ))}
               </div>
            </div>
          )}

          {/* Deposit Section */}
          {activeSection === 'deposit' && (
            <div className="space-y-8">
               <Card className="bg-card border-border rounded-[2.5rem] overflow-hidden shadow-md border">
                  <CardHeader className="bg-white/5 p-8 border-b border-border">
                      <CardTitle className="text-2xl font-black italic vibrant-text tracking-tighter uppercase">Deposit Approvals</CardTitle>
                      <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1 font-mono">Verify and approve money deposits</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                      <div className="overflow-x-auto">
                         <table className="w-full text-left">
                            <thead className="bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                               <tr>
                                  <th className="p-6">Date</th>
                                  <th className="p-6">User</th>
                                  <th className="p-6">Amount</th>
                                  <th className="p-6">Coin</th>
                                  <th className="p-6">Status</th>
                                  <th className="p-6 text-right">Actions</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                               {transactions.filter(t => t.type === 'deposit').map(tx => (
                                 <tr key={tx.id} className="hover:bg-white/5 transition-all group">
                                    <td className="p-6 text-[10px] font-mono font-bold text-slate-400">
                                       {tx.createdAt ? format(tx.createdAt.toDate(), 'MMM dd, HH:mm') : 'Now'}
                                    </td>
                                    <td className="p-6">
                                       <p className="font-black text-white italic uppercase tracking-tighter group-hover:text-primary transition-colors">{tx.userName}</p>
                                       <p className="text-[10px] text-slate-400 font-mono tracking-tight font-bold italic">{tx.userEmail}</p>
                                    </td>
                                    <td className="p-6">
                                       <p className="text-2xl font-black italic text-primary tracking-tighter font-mono">${tx.amount?.toLocaleString()}</p>
                                    </td>
                                    <td className="p-6 text-[10px] font-black uppercase italic text-slate-400">
                                       {tx.currency} ({tx.network})
                                    </td>
                                    <td className="p-6">
                                       <Badge className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border-none ${tx.status === 'pending' ? 'bg-primary text-primary-foreground animate-pulse' : tx.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                          {tx.status}
                                       </Badge>
                                    </td>
                                    <td className="p-6 text-right">
                                       <div className="flex items-center justify-end gap-3">
                                          <Button size="icon" variant="ghost" className="size-10 rounded-xl bg-background border border-border hover:bg-white/5 text-slate-500" onClick={() => { setSelectedTx(tx); setIsReceiptOpen(true); }}>
                                             <Eye size={18} />
                                          </Button>
                                          {tx.status === 'pending' && (
                                            <>
                                              <Button size="icon" className="size-10 rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200" onClick={() => handleApproveTransaction(tx)}>
                                                 <Check size={18} />
                                              </Button>
                                              <Button size="icon" className="size-10 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200" onClick={() => handleRejectTransaction(tx)}>
                                                 <X size={18} />
                                              </Button>
                                            </>
                                          )}
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
          )}

          {/* Withdrawal Section */}
          {activeSection === 'withdrawal' && (
            <div className="space-y-8">
               <Card className="bg-card border-border rounded-[2.5rem] overflow-hidden shadow-md border">
                  <CardHeader className="bg-white/5 p-8 border-b border-border">
                      <CardTitle className="text-2xl font-black italic vibrant-text tracking-tighter uppercase italic">Withdraw Approvals</CardTitle>
                      <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1 font-mono">Approve or reject money withdrawals</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                      <div className="overflow-x-auto">
                         <table className="w-full text-left">
                            <thead className="bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                               <tr>
                                  <th className="p-6">Date</th>
                                  <th className="p-6">User</th>
                                  <th className="p-6">Amount</th>
                                  <th className="p-6">Destination</th>
                                  <th className="p-6">Status</th>
                                  <th className="p-6 text-right">Actions</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                               {transactions.filter(t => t.type === 'withdrawal').map(tx => (
                                 <tr key={tx.id} className="hover:bg-white/5 transition-all group">
                                    <td className="p-6 text-[10px] font-mono font-bold text-slate-400">
                                       {tx.createdAt ? format(tx.createdAt.toDate(), 'MMM dd, HH:mm') : 'Now'}
                                    </td>
                                    <td className="p-6">
                                       <p className="font-black text-white italic uppercase tracking-tighter group-hover:text-primary transition-colors">{tx.userName}</p>
                                       <p className="text-[10px] text-slate-400 font-mono tracking-tight font-bold italic">{tx.userEmail}</p>
                                    </td>
                                    <td className="p-6">
                                       <p className="text-2xl font-black italic text-orange-600 tracking-tighter font-mono">${tx.amount?.toLocaleString()}</p>
                                    </td>
                                    <td className="p-6">
                                       <div className="max-w-[150px]">
                                          <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1">{tx.currency} Wallet</p>
                                          <p className="text-[8px] font-mono text-slate-300 truncate bg-background p-2 rounded-lg border border-border select-all" title={tx.walletAddress}>{tx.walletAddress || 'No Address'}</p>
                                       </div>
                                    </td>
                                    <td className="p-6">
                                       <Badge className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border-none ${tx.status === 'pending' ? 'bg-primary text-primary-foreground animate-pulse' : tx.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                          {tx.status}
                                       </Badge>
                                    </td>
                                    <td className="p-6 text-right">
                                       <div className="flex items-center justify-end gap-3">
                                          {tx.status === 'pending' && (
                                            <>
                                              <Button size="icon" className="size-10 rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200" onClick={() => handleApproveTransaction(tx)}>
                                                 <Check size={18} />
                                              </Button>
                                              <Button size="icon" className="size-10 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200" onClick={() => handleRejectTransaction(tx)}>
                                                 <X size={18} />
                                              </Button>
                                            </>
                                          )}
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
          )}

          {/* Chat Section */}
          {activeSection === 'chat' && (
            <div className="h-[calc(100vh-180px)]">
               <AdminChatManager />
            </div>
          )}

          {/* Wallets Manager Section */}
          {activeSection === 'wallets' && (
            <div className="space-y-10">
               <div className="flex items-center justify-between">
                  <header>
                    <h2 className="text-3xl font-black italic vibrant-text tracking-tighter uppercase underline decoration-primary/50 decoration-4 underline-offset-8">Crypto Wallets</h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-4">Manage addresses where users send their deposits</p>
                  </header>
                  <Button onClick={() => {
                      setEditingWallet(null);
                      setIsWalletModalOpen(true);
                  }} className="bg-primary text-primary-foreground font-black uppercase text-xs h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                     <Plus className="mr-2 size-5" /> Add New Wallet
                  </Button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {wallets.map(w => (
                    <Card key={w.id} className="bg-card border-border rounded-[2rem] overflow-hidden group hover:border-primary/50 transition-all shadow-md relative border">
                       <div className="h-2 w-full bg-white/5 group-hover:bg-primary transition-all duration-700" />
                       <CardContent className="p-8">
                          <div className="flex justify-between items-start mb-6">
                             <div className="flex items-center gap-4">
                                <div className="size-16 rounded-2xl bg-white p-1 border-2 border-primary/10 shadow-sm overflow-hidden flex items-center justify-center">
                                   {w.qrCodeUrl ? (
                                     <img src={w.qrCodeUrl} alt="QR" className="w-full h-full object-contain" />
                                   ) : (
                                     <QrCode className="text-slate-200 size-8" />
                                   )}
                                </div>
                                <div>
                                   <h3 className="text-xl font-black italic uppercase tracking-tighter text-white group-hover:text-primary transition-colors">{w.currency}</h3>
                                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{w.network} NETWORK</p>
                                </div>
                             </div>
                              <div className="flex flex-col gap-2 w-full">
                                 <Button 
                                   className="h-12 bg-background border border-border text-primary font-black uppercase text-[10px] rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all gap-3 px-6 shadow-sm" 
                                   onClick={() => {
                                     setEditingWallet(w);
                                     setIsWalletModalOpen(true);
                                   }}
                                 >
                                    <Edit2 size={16} /> Edit Wallet Address
                                 </Button>
                                 <Button 
                                   variant="ghost"
                                   className="h-10 text-red-500 hover:bg-red-500/10 hover:text-red-600 rounded-xl text-[9px] font-black uppercase transition-all"
                                   onClick={() => handleDeleteWallet(w.id)}
                                 >
                                    <Trash2 size={12} className="mr-2" /> Delete Wallet
                                 </Button>
                              </div>
                          </div>

                          <div className="bg-white/5 p-4 rounded-xl border border-border">
                             <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Public Address</p>
                             <p className="text-[11px] font-mono text-slate-300 break-all bg-background p-3 rounded-lg border border-border select-all">{w.address}</p>
                          </div>
                       </CardContent>
                    </Card>
                  ))}
               </div>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="space-y-10 pb-10">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="bg-card border-border rounded-3xl overflow-hidden shadow-md border-t-4 border-t-primary border">
                      <CardHeader className="p-8 border-b border-border bg-white/5">
                         <CardTitle className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-3 text-white">
                           <CreditCard className="size-5 text-primary" /> Withdrawal Rules
                         </CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 space-y-6">
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                   <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Min Amount ($)</Label>
                   <Input 
                     type="number" 
                     className="bg-background border-border h-14 font-black italic text-lg px-4 rounded-xl text-white placeholder:text-slate-200" 
                     value={config.minWithdrawal}
                     onChange={(e) => setConfig({...config, minWithdrawal: parseFloat(e.target.value)})}
                   />
                </div>
                <div className="space-y-3">
                   <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Max Amount ($)</Label>
                   <Input 
                     type="number" 
                     className="bg-background border-border h-14 font-black italic text-lg px-4 rounded-xl text-white placeholder:text-slate-200" 
                     value={config.maxWithdrawal}
                     onChange={(e) => setConfig({...config, maxWithdrawal: parseFloat(e.target.value)})}
                   />
                </div>
             </div>
                         <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                               <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Withdraw Fee</Label>
                               <div className="flex gap-2">
                                  <Input 
                                    type="number" 
                                    className="bg-background border-border h-14 flex-1 font-black italic text-lg px-4 rounded-xl text-white" 
                                    value={config.withdrawalFee}
                                    onChange={(e) => setConfig({...config, withdrawalFee: parseFloat(e.target.value)})}
                                  />
                                  <Select 
                                    value={config.withdrawalFeeType} 
                                    onValueChange={(val) => setConfig({...config, withdrawalFeeType: val})}
                                  >
                                    <SelectTrigger className="w-20 bg-background border-border h-14 font-black text-xs rounded-xl text-white">
                                       <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-white">
                                       <SelectItem value="percentage">%</SelectItem>
                                       <SelectItem value="fixed">$</SelectItem>
                                    </SelectContent>
                                  </Select>
                               </div>
                            </div>
                            <div className="space-y-3">
                               <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Referral Bonus ($)</Label>
                               <Input 
                                 type="number" 
                                 className="bg-background border-border h-14 font-black italic text-lg px-4 rounded-xl text-white" 
                                 value={config.referralBonus}
                                 onChange={(e) => setConfig({...config, referralBonus: parseFloat(e.target.value)})}
                               />
                            </div>
                         </div>
                      </CardContent>
                  </Card>

                  <Card className="bg-card border-border rounded-[2.5rem] overflow-hidden shadow-md border">
                      <CardHeader className="p-8 border-b border-border bg-white/5">
                         <CardTitle className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-3 text-white">
                           <Globe className="size-5 text-primary" /> Contact & Information
                         </CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 space-y-6">
                         <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">WhatsApp Group Link</Label>
                            <Input 
                              placeholder="https://chat.whatsapp.com/..." 
                              className="bg-background border-border h-14 px-4 rounded-xl font-medium text-white placeholder:text-slate-400" 
                              value={config.whatsappLink}
                              onChange={(e) => setConfig({...config, whatsappLink: e.target.value})}
                            />
                         </div>
                         <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Admin Chat Link (Support Page)</Label>
                            <Input 
                              placeholder="https://t.me/admin or support link" 
                              className="bg-background border-border h-14 px-4 rounded-xl font-medium text-white placeholder:text-slate-400" 
                              value={config.contactLink}
                              onChange={(e) => setConfig({...config, contactLink: e.target.value})}
                            />
                         </div>
                         <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Deposit Receipt Instructions</Label>
                            <textarea 
                               className="w-full bg-background border-border p-4 rounded-xl font-medium text-white placeholder:text-slate-400 h-32 focus:outline-none focus:ring-1 focus:ring-primary/40 text-sm shadow-sm"
                               placeholder="Instructions shown to users on deposit page..."
                               value={config.depositInstruction}
                               onChange={(e) => setConfig({...config, depositInstruction: e.target.value})}
                            />
                         </div>
                      </CardContent>
                  </Card>
               </div>

               <div className="flex flex-col items-center gap-8">
                  <div className="w-full max-w-sm p-6 bg-white/5 border border-border rounded-2xl mb-4 text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Notification Connectivity</p>
                    <div className="flex items-center justify-center gap-2">
                      <div className={`size-3 rounded-full ${users.find(u => (u.uid || u.id) === auth.currentUser?.uid)?.fcmTokens?.length > 0 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-red-500'}`} />
                      <span className="text-xs font-bold text-white uppercase italic">
                        {users.find(u => (u.uid || u.id) === auth.currentUser?.uid)?.fcmTokens?.length || 0} Registered Devices
                      </span>
                    </div>
                  </div>

                  <Button 
                     variant="outline"
                     className="w-full max-w-sm h-14 bg-white/5 border-primary/20 text-primary font-black uppercase text-xs rounded-2xl hover:bg-primary/5 transition-all mb-4"
                     onClick={() => auth.currentUser && requestNotificationPermission(auth.currentUser.uid).then((token) => {
                        if (token) toast.success('Notifications active on this device!');
                        else toast.error('Permission blocked or setup failed.');
                     })}
                  >
                     <ShieldAlert className="mr-2 size-4" /> Sync Push Notifications
                  </Button>
                  
                  <Button 
                     variant="outline"
                     className="w-full max-w-sm h-14 bg-primary/10 border-primary text-primary font-black uppercase text-xs rounded-2xl hover:bg-primary hover:text-white transition-all mb-4"
                     onClick={handleTestNotification}
                  >
                     <Send className="mr-2 size-4" /> Send Test Notification
                  </Button>
                  
                  <Button className="w-full max-w-sm h-16 bg-primary text-primary-foreground font-black uppercase text-sm rounded-3xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all" onClick={handleUpdateConfig}>
                     Save All Settings <Check className="ml-2 size-5" />
                  </Button>

                  <Card className="w-full max-w-sm bg-red-500/5 border-red-500/20 rounded-3xl overflow-hidden border">
                    <CardHeader className="p-6 border-b border-red-500/10">
                      <CardTitle className="text-sm font-black uppercase italic tracking-tighter text-red-500 flex items-center gap-2">
                        <Trash2 className="size-4" /> Danger Zone
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4 italic">
                        Perform a full system reset before site launch. This will delete all user data except admin accounts.
                      </p>
                      <Button 
                        variant="ghost" 
                        className="w-full bg-red-500 text-white font-black uppercase text-[10px] h-12 rounded-2xl hover:bg-red-600 transition-all shadow-md"
                        onClick={handleSystemReset}
                      >
                        Wipe Platform Data
                      </Button>
                    </CardContent>
                  </Card>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="bg-card border-border text-slate-500 max-w-lg rounded-[2.5rem] p-0 overflow-hidden shadow-2xl border">
           <DialogHeader className="p-8 bg-white/5 border-b border-border text-center">
              <DialogTitle className="text-2xl font-black italic vibrant-text uppercase">Audit Transaction</DialogTitle>
           </DialogHeader>
           
           <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
              {selectedTx && (
                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4 bg-white/5 p-6 rounded-2xl border border-border">
                      <div>
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Status</p>
                         <Badge className={`rounded-md px-2 text-[9px] uppercase font-black border-none ${selectedTx.status === 'pending' ? 'bg-primary text-primary-foreground' : selectedTx.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {selectedTx.status}
                         </Badge>
                      </div>
                      <div>
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Amount</p>
                         <p className="font-black text-xl italic text-white font-mono">${selectedTx.amount?.toLocaleString()}</p>
                      </div>
                      <div className="col-span-2">
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Transaction Hash</p>
                         <p className="text-[9px] font-mono text-primary break-all bg-background p-3 rounded-lg border border-border italic font-bold">{selectedTx.txHash || 'NOT PROVIDED'}</p>
                      </div>
                   </div>

                   {selectedTx.receiptUrl && (
                     <div className="space-y-4">
                        <Label className="text-[9px] font-black uppercase text-center block text-slate-400">Payment Screenshot</Label>
                        <div className="rounded-2xl overflow-hidden border-2 border-dashed border-border p-2 bg-white/5 group">
                           <img 
                             src={selectedTx.receiptUrl} 
                             alt="Payment Proof" 
                             className="w-full rounded-xl transition-transform duration-700 group-hover:scale-110 cursor-pointer" 
                             onClick={() => window.open(selectedTx.receiptUrl, '_blank')}
                           />
                        </div>
                        <p className="text-[9px] text-slate-300 text-center uppercase font-black">Tap image to view full size</p>
                     </div>
                   )}
                </div>
              )}
           </div>

           <DialogFooter className="p-8 border-t border-border flex gap-4 bg-white/5">
              {selectedTx?.status === 'pending' && (
                <>
                   <Button variant="ghost" className="flex-1 h-14 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black uppercase text-xs" onClick={() => handleRejectTransaction(selectedTx)}>Reject</Button>
                   <Button className="flex-1 h-14 bg-green-500 text-white hover:bg-green-600 rounded-2xl font-black uppercase shadow-lg shadow-green-100 text-xs" onClick={() => handleApproveTransaction(selectedTx)}>Approve</Button>
                </>
              )}
              {selectedTx?.status !== 'pending' && (
                <Button className="w-full h-14 bg-background border border-border text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-white/5" onClick={() => setIsReceiptOpen(false)}>Close Window</Button>
              )}
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Modal */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="bg-card border-border text-slate-500 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl border max-w-md">
           <DialogHeader className="p-8 bg-white/5 border-b border-border text-center">
              <DialogTitle className="text-3xl font-black italic vibrant-text uppercase underline decoration-primary decoration-4">Plan Settings</DialogTitle>
           </DialogHeader>
           
           <form onSubmit={handleSavePlan} className="p-8 space-y-6">
              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Plan Name</Label>
                 <Input name="name" defaultValue={editingPlan?.name} className="bg-background border-border h-14 font-black italic text-lg px-4 rounded-xl text-white" placeholder="e.g. PREMIUM PLAN" required />
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Min Deposit ($)</Label>
                    <Input name="minDeposit" type="number" defaultValue={editingPlan?.minDeposit} className="bg-background border-border h-14 font-black italic text-lg px-4 rounded-xl font-mono text-white" required />
                 </div>
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Max Deposit ($)</Label>
                    <Input name="maxDeposit" type="number" defaultValue={editingPlan?.maxDeposit} className="bg-background border-border h-14 font-black italic text-lg px-4 rounded-xl font-mono text-white" required />
                 </div>
              </div>
               <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Yield Type</Label>
                    <select name="profitType" defaultValue={editingPlan?.profitType || 'percentage'} className="bg-background border-border h-14 w-full rounded-xl px-4 text-xs font-black uppercase text-white">
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                 </div>
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Yield Value</Label>
                    <Input name="profitValue" type="number" step="0.1" defaultValue={editingPlan?.profitValue || editingPlan?.dailyROI} className="bg-background border-border h-14 font-black italic text-lg px-4 rounded-xl font-mono text-primary" required />
                 </div>
              </div>
              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Duration</Label>
                 <div className="flex gap-2">
                    <Input name="duration" type="number" defaultValue={editingPlan?.durationDays || editingPlan?.durationHours} className="bg-background border-border h-14 font-black italic text-lg px-4 rounded-xl font-mono text-white flex-1" required />
                    <select name="durationUnit" defaultValue={editingPlan?.durationHours ? 'hours' : 'days'} className="bg-background border-border h-14 rounded-xl px-4 text-[10px] font-black uppercase text-white">
                      <option value="days">Days</option>
                      <option value="hours">Hours</option>
                    </select>
                 </div>
              </div>
              
              <DialogFooter className="pt-6">
                 <Button type="button" variant="ghost" onClick={() => setIsPlanModalOpen(false)} className="uppercase text-[10px] font-black text-slate-400 rounded-xl hover:bg-white/5">Cancel</Button>
                 <Button type="submit" className="bg-primary text-primary-foreground font-black uppercase text-xs h-14 px-8 rounded-2xl shadow-lg shadow-primary/20 flex-1">Save Plan</Button>
              </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>

      {/* Wallet Modal */}
      <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
        <DialogContent className="bg-card border-border text-slate-500 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl border max-w-md">
           <DialogHeader className="p-8 bg-white/5 border-b border-border text-center">
              <DialogTitle className="text-3xl font-black italic vibrant-text uppercase underline decoration-primary decoration-4">{editingWallet ? 'Edit Wallet' : 'Add Wallet'}</DialogTitle>
           </DialogHeader>
           
           <form key={editingWallet?.id || 'new'} onSubmit={handleSaveWallet} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Currency Code</Label>
                    <input 
                       value={walletForm.currency} 
                       onChange={(e) => setWalletForm({...walletForm, currency: e.target.value})}
                       className="bg-background border border-border h-14 font-black italic text-lg px-4 rounded-xl text-white w-full outline-none focus:ring-1 focus:ring-primary/40" 
                       placeholder="BTC" 
                       required 
                    />
                 </div>
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Network</Label>
                    <input 
                       value={walletForm.network} 
                       onChange={(e) => setWalletForm({...walletForm, network: e.target.value})}
                       className="bg-background border border-border h-14 font-black italic text-lg px-4 rounded-xl text-white w-full outline-none focus:ring-1 focus:ring-primary/40" 
                       placeholder="TRC20" 
                       required 
                    />
                 </div>
              </div>
              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Wallet Address</Label>
                 <input 
                    value={walletForm.address} 
                    onChange={(e) => setWalletForm({...walletForm, address: e.target.value})}
                    className="bg-background border border-border h-14 font-black italic text-sm px-4 rounded-xl text-white font-mono w-full outline-none focus:ring-1 focus:ring-primary/40" 
                    placeholder="Paste address here" 
                    required 
                 />
              </div>
              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">QR Code Image</Label>
                 <div className="flex flex-col gap-3">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileUpload(e, 'qrCodeUrl')}
                      className="bg-background border border-border h-12 text-[10px] font-black uppercase cursor-pointer rounded-xl flex items-center justify-center p-2 text-white"
                    />
                    <div className="text-[9px] text-slate-400 font-mono break-all line-clamp-2 bg-white/5 p-2 rounded border border-border">
                       {walletForm.qrCodeUrl ? 'Image loaded' : 'No image selected'}
                    </div>
                 </div>
              </div>
              
              <DialogFooter className="pt-6">
                 <Button type="button" variant="ghost" onClick={() => setIsWalletModalOpen(false)} className="uppercase text-[10px] font-black text-slate-400 rounded-xl hover:bg-white/5">Cancel</Button>
                 <Button type="submit" className="bg-primary text-primary-foreground font-black uppercase text-xs h-14 px-8 rounded-2xl shadow-lg shadow-primary/20 flex-1">Save Wallet</Button>
              </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminChatManager() {
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'chats'), orderBy('lastActive', 'desc')), (snap) => {
      setChats(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'chats'));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedChat) return;
    const unsub = onSnapshot(query(collection(db, 'chats', selectedChat.id, 'messages'), orderBy('createdAt', 'asc')), (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (e) => handleFirestoreError(e, OperationType.LIST, `chats/${selectedChat.id}/messages`));
    return () => unsub();
  }, [selectedChat]);

  // Handle load scroll and new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, [messages.length, selectedChat]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedChat) return;

    const msg = input;
    setInput('');

    try {
      await addDoc(collection(db, 'chats', selectedChat.id, 'messages'), {
        text: msg,
        senderId: 'admin',
        senderName: 'Admin Support',
        createdAt: serverTimestamp()
      });
      
      // Force scroll on send
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);

      await updateDoc(doc(db, 'chats', selectedChat.id), {
        lastMessage: msg,
        lastActive: serverTimestamp(),
        unreadByAdmin: false,
        unreadByUser: true
      });
    } catch (e: any) {
      toast.error('Failed to send reply');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-6">
      <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-[10px] font-black uppercase tracking-[0.4em]">Connecting to Chat...</span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full">
      <Card className="bg-card border-border md:col-span-1 overflow-hidden flex flex-col rounded-[2.5rem] shadow-md border">
         <CardHeader className="border-b border-border bg-white/5 p-6">
            <CardTitle className="text-[10px] font-black tracking-widest uppercase flex items-center gap-3 text-white">
              <MessageSquare className="size-4 text-primary" /> Active User Chats
            </CardTitle>
         </CardHeader>
         <CardContent className="p-0 flex-1 overflow-y-auto no-scrollbar">
            <div className="divide-y divide-border">
               {chats.map(chat => (
                  <div 
                    key={chat.id} 
                    onClick={() => {
                        setSelectedChat(chat);
                        if (chat.unreadByAdmin) {
                            updateDoc(doc(db, 'chats', chat.id), { unreadByAdmin: false });
                        }
                    }}
                    className={`p-6 cursor-pointer hover:bg-white/5 transition-all border-l-4 ${selectedChat?.id === chat.id ? 'bg-white/5 border-primary' : 'border-transparent'}`}
                  >
                     <div className="flex justify-between items-start mb-2">
                        <div className="font-black text-sm text-white italic uppercase tracking-tighter">{chat.userName}</div>
                        {chat.unreadByAdmin && <div className="size-2 rounded-full bg-primary animate-pulse" />}
                     </div>
                     <div className="text-[10px] text-slate-400 font-mono truncate font-bold italic">{chat.lastMessage}</div>
                  </div>
               ))}
               {chats.length === 0 && (
                 <div className="p-20 text-center text-slate-300 italic uppercase font-black text-[10px]">
                    No messages yet
                 </div>
               )}
            </div>
         </CardContent>
      </Card>

      <Card className="bg-card border-border md:col-span-2 overflow-hidden flex flex-col rounded-[2.5rem] shadow-md border relative">
         {selectedChat ? (
            <>
               <CardHeader className="border-b border-border bg-white/5 flex flex-row items-center justify-between p-6 shrink-0">
                  <div className="flex items-center gap-4">
                     <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black italic text-lg">
                        {selectedChat.userName?.substring(0, 1)}
                     </div>
                     <div>
                        <div className="font-black text-white uppercase italic tracking-tighter text-base leading-none mb-1">{selectedChat.userName}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-bold tracking-tight">{selectedChat.userEmail}</div>
                     </div>
                  </div>
                  <Badge className="bg-primary/20 text-primary uppercase text-[8px] tracking-widest border-none px-2 h-6">Live Link</Badge>
               </CardHeader>
               <CardContent className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar bg-white/5">
                  {messages.map((m, i) => (
                     <div key={i} className={`flex ${m.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] ${m.senderId === 'admin' ? 'bg-primary text-primary-foreground font-black rounded-tr-none shadow-sm' : 'bg-background text-slate-300 border border-border rounded-tl-none font-medium shadow-sm'}`}>
                           {m.text}
                           <div className={`text-[8px] mt-2 opacity-50 font-black ${m.senderId === 'admin' ? 'text-primary-foreground/60 text-right' : 'text-slate-400'}`}>
                             {m.createdAt ? format(m.createdAt.toDate(), 'HH:mm') : '...'}
                           </div>
                        </div>
                     </div>
                  ))}
                  <div ref={scrollRef} />
               </CardContent>
               <div className="p-8 border-t border-border bg-white/5 shrink-0">
                  <form onSubmit={handleSend} className="flex gap-4">
                     <Input 
                        placeholder="Type your reply here..." 
                        className="bg-background border-border h-14 text-sm rounded-xl px-6 focus:border-primary font-bold text-white placeholder:text-slate-200 shadow-sm"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                     />
                     <Button type="submit" size="icon" className="size-14 rounded-xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                        <Share2 className="size-6" />
                     </Button>
                  </form>
               </div>
            </>
         ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6">
               <MessageSquare className="size-16 opacity-10" />
               <div className="font-black text-[10px] uppercase tracking-[0.4em] italic animate-pulse">Select a chat to reply</div>
            </div>
         )}
      </Card>
    </div>
  );
}
