import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Copy, Upload, CheckCircle2, QrCode, ArrowRight, ShieldCheck, DollarSign, Wallet } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export default function DepositPage() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen to Wallets
    const unsubWallets = onSnapshot(collection(db, 'wallets'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWallets(data);
      if (data.length > 0 && !selectedWallet) setSelectedWallet(data[0]);
    });

    // Listen to Config
    const unsubConfig = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });

    return () => {
      unsubWallets();
      unsubConfig();
    };
  }, []);

  const handleCopy = () => {
    if (!selectedWallet) return;
    navigator.clipboard.writeText(selectedWallet.address);
    toast.success('Address copied to clipboard');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Get signed signature from our express backend
      const res = await fetch('/api/upload/signature', { method: 'POST' });
      const { timestamp, signature, cloud_name, api_key } = await res.json();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', api_key);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('upload_preset', 'Goldbrick');

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await uploadRes.json();
      setReceiptUrl(data.secure_url);
      toast.success('Proof of payment received');
    } catch (error) {
      toast.error('Upload sequence interrupted. Try again.');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitDeposit = async () => {
    if (!amount || !txHash || !receiptUrl) {
      return toast.error('Required fields: Amount, TX Hash, and Receipt');
    }

    setLoading(true);
    try {
      const pathTx = 'transactions';
      await addDoc(collection(db, pathTx), {
        userId: userData?.uid,
        userName: userData?.displayName || 'Investor',
        userEmail: userData?.email,
        type: 'deposit',
        amount: parseFloat(amount),
        currency: selectedWallet.symbol,
        status: 'pending',
        receiptUrl,
        txHash,
        walletAddress: selectedWallet.address,
        network: selectedWallet.network,
        createdAt: serverTimestamp()
      }).catch(e => handleFirestoreError(e, OperationType.CREATE, pathTx));
      setStep(3);
      toast.success('Capital injection submitted for audit');
    } catch (e: any) {
      toast.error(e.message || 'Deposit sequence failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-10 pb-12">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase gold-text leading-tight">Deposit Money</h1>
          <p className="text-zinc-500 font-mono text-[9px] md:text-[10px] uppercase tracking-widest font-bold">Add money to your account using crypto</p>
        </header>

        {step === 1 && (
          <Card className="bg-[#080808] border-primary/20 shadow-2xl gold-glow rounded-[2.5rem] overflow-hidden border-t-4 border-t-primary">
            <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
               <CardTitle className="text-2xl font-black italic uppercase tracking-tighter gold-text">Configure Amount</CardTitle>
               <CardDescription className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold mt-1">SELECT YOUR PREFERRED ASSET AND INJECTION VOLUME</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-10">
               <div className="space-y-4">
                  <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Choose Crypto Currency</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {wallets.map(w => (
                       <div 
                         key={w.id} 
                         onClick={() => setSelectedWallet(w)}
                         className={`p-5 rounded-[1.5rem] border cursor-pointer transition-all flex items-center justify-between group ${selectedWallet?.id === w.id ? 'bg-primary/5 border-primary gold-glow' : 'bg-black border-zinc-900 hover:border-zinc-700'}`}
                       >
                          <div className="flex items-center gap-4">
                             <div className={`size-12 rounded-2xl flex items-center justify-center font-black italic text-xl transition-all ${selectedWallet?.id === w.id ? 'bg-primary text-black' : 'bg-zinc-900 text-zinc-500'}`}>
                                {w.symbol[0]}
                             </div>
                             <div>
                                <div className={`font-black uppercase tracking-tighter italic ${selectedWallet?.id === w.id ? 'text-primary' : 'text-zinc-400'}`}>{w.currency}</div>
                                <div className="text-[10px] text-zinc-500 font-mono uppercase font-bold tracking-widest">{w.network}</div>
                             </div>
                          </div>
                          {selectedWallet?.id === w.id && <CheckCircle2 className="text-primary size-6 animate-in zoom-in" />}
                       </div>
                     ))}
                     {wallets.length === 0 && (
                       <div className="p-8 bg-zinc-950 border border-zinc-900 border-dashed rounded-3xl text-center text-[10px] text-zinc-600 uppercase tracking-widest">
                         Waiting for wallet availability...
                       </div>
                     )}
                  </div>
               </div>

               <div className="space-y-3">
                  <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Deposit Amount (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 size-8 text-primary/30" />
                    <Input 
                      type="number" 
                      placeholder="500.00" 
                      className="bg-[#0c0c0c] border-[#1a1a1a] h-16 md:h-20 text-2xl md:text-4xl font-black font-mono text-primary pl-14 md:pl-16 rounded-2xl md:rounded-[1.5rem] placeholder:text-zinc-900"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 italic font-medium px-2">Minimum deposit: $100</p>
               </div>

               <Button 
                 onClick={() => setStep(2)} 
                 disabled={!amount || parseFloat(amount) < 10 || !selectedWallet} 
                 className="w-full h-16 bg-primary text-black font-black text-lg uppercase tracking-widest rounded-2xl gold-glow hover:scale-[1.01] transition-all"
               >
                 CONTINUE <ArrowRight className="ml-2 size-5" />
               </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && selectedWallet && (
          <div className="space-y-6">
            <Card className="bg-[#080808] border-primary/20 shadow-2xl gold-glow rounded-[2.5rem] overflow-hidden border-t-4 border-t-primary">
               <CardHeader className="text-center p-6 md:p-8 border-b border-zinc-900 bg-zinc-900/20">
                  <CardTitle className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase gold-text">Finalize Deposit</CardTitle>
                  <CardDescription className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold mt-2">TRANSFER {amount} USD EQUIVALENT TO THE ADDRESS BELOW</CardDescription>
               </CardHeader>
               <CardContent className="flex flex-col items-center p-6 md:p-10 space-y-6 md:space-y-8">
                  <div className="p-6 bg-white rounded-[2rem] shadow-2xl shadow-white/5 relative group">
                     {selectedWallet.qrCodeUrl ? (
                        <img src={selectedWallet.qrCodeUrl} alt="QR Code" className="size-[200px] object-contain" />
                     ) : (
                        <QRCodeSVG value={selectedWallet.address} size={200} />
                     )}
                     <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] flex items-center justify-center">
                        <QrCode className="size-16 text-black opacity-20" />
                     </div>
                  </div>
                  
                  <div className="w-full space-y-8">
                    <div className="space-y-4 text-center">
                       <Label className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">OFFICIAL {selectedWallet.currency} VAULT ({selectedWallet.network})</Label>
                       <div className="flex items-center gap-2 bg-[#0c0c0c] border border-zinc-900 p-6 rounded-2xl group relative overflow-hidden">
                          <div className="absolute inset-0 bg-primary/5 translate-x-[-100%] group-hover:translate-x-[0%] transition-transform duration-500" />
                          <span className="text-sm font-black font-mono break-all text-primary flex-1 z-10">{selectedWallet.address}</span>
                          <Button size="icon" variant="ghost" onClick={handleCopy} className="size-12 rounded-xl bg-zinc-900 text-primary hover:bg-primary hover:text-black transition-all z-10">
                            <Copy className="size-5" />
                          </Button>
                       </div>
                    </div>

                    <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-900 space-y-3">
                       <div className="flex items-center gap-3 text-primary">
                          <ShieldCheck className="size-5" />
                          <span className="text-[10px] font-black uppercase tracking-widest italic">Command Instructions</span>
                       </div>
                       <p className="text-[11px] text-zinc-400 font-medium leading-relaxed leading-snug">
                         {config?.depositInstruction || "Send the exact USD equivalent in crypto to the address provided. Transactions are monitored 24/7."}
                       </p>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-zinc-900">
                       <div className="space-y-3">
                          <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Transaction Signature (TXID)</Label>
                          <div className="relative">
                            <Wallet className="absolute left-6 top-1/2 -translate-y-1/2 size-5 text-primary/30" />
                            <Input 
                              placeholder="PASTE BLOCKCHAIN HASH HERE" 
                              className="bg-[#0c0c0c] border-[#1a1a1a] h-14 pl-14 rounded-xl font-mono text-sm uppercase tracking-widest text-zinc-300 placeholder:text-zinc-800"
                              value={txHash}
                              onChange={(e) => setTxHash(e.target.value)}
                            />
                          </div>
                       </div>
                       <div className="space-y-3">
                          <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Visual Audit Proof (SCREENSHOT)</Label>
                          <div className="relative">
                             <Input 
                                type="file" 
                                className="hidden" 
                                id="receipt" 
                                onChange={handleFileUpload}
                                accept="image/*"
                             />
                             <Label 
                                htmlFor="receipt" 
                                className="flex items-center justify-center gap-4 bg-[#0c0c0c] border border-zinc-900 border-dashed py-12 rounded-[1.5rem] cursor-pointer hover:border-primary transition-all group overflow-hidden relative"
                             >
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                {isUploading ? (
                                  <div className="flex flex-col items-center gap-3">
                                    <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Uploading Evidence...</span>
                                  </div>
                                ) : receiptUrl ? (
                                  <div className="flex items-center gap-3 text-green-500 font-black uppercase tracking-widest text-xs scale-110 transition-transform">
                                    <CheckCircle2 className="size-6" /> 
                                    <span>Audit Evidence Logged</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-4 text-center">
                                     <Upload className="size-10 text-zinc-700 group-hover:text-primary transition-colors" /> 
                                     <div className="space-y-1">
                                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-white">Upload Receipt Screenshot</span>
                                       <p className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest">JPG, PNG OR PDF | MAX 5MB</p>
                                     </div>
                                  </div>
                                )}
                             </Label>
                          </div>
                       </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSubmitDeposit} 
                    disabled={loading || !receiptUrl || !txHash} 
                    className="w-full h-16 bg-primary text-black font-black text-lg uppercase tracking-widest rounded-2xl gold-glow hover:scale-[1.01] transition-all"
                  >
                    {loading ? 'SYNCING WITH LEDGER...' : 'CONFIRM CAPITAL INJECTION'}
                  </Button>
               </CardContent>
            </Card>
            <Button variant="ghost" onClick={() => setStep(1)} className="w-full text-zinc-500 font-black uppercase text-[10px] tracking-[0.3em] hover:text-white">Cancel Operation</Button>
          </div>
        )}

        {step === 3 && (
          <Card className="bg-[#080808] border-zinc-900 text-center py-20 rounded-[3rem] shadow-2xl gold-glow">
             <CardContent className="space-y-8">
                <div className="size-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-500/5">
                   <CheckCircle2 className="size-12" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter gold-text">Deposit Pending</h2>
                  <p className="text-zinc-400 font-medium max-w-sm mx-auto leading-relaxed">
                    Your deposit of <span className="text-white font-bold">${amount}</span> has been received. 
                    We are verifying your transaction. Your money will show up within 30 minutes.
                  </p>
                </div>
                <div className="pt-8 flex flex-col items-center gap-4 max-w-xs mx-auto">
                   <Button onClick={() => navigate('/transactions')} className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest rounded-xl gold-glow">AUDIT LOGS</Button>
                   <Button variant="ghost" onClick={() => navigate('/dashboard')} className="w-full uppercase text-[10px] font-black tracking-widest text-zinc-500 hover:text-white">BACK TO CORE</Button>
                </div>
             </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
