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
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Signature fetch failed: ${errorText}`);
      }
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
      
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error?.message || 'Cloudinary upload failed');
      }

      const data = await uploadRes.json();
      setReceiptUrl(data.secure_url);
      toast.success('Proof of payment received');
    } catch (error: any) {
      toast.error(error.message || 'Upload sequence interrupted. Try again.');
      console.error('Upload Error:', error);
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
      <div className="max-w-2xl mx-auto space-y-10 pb-12 px-4 sm:px-0">
        <header className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase vibrant-text leading-tight drop-shadow-sm">Deposit Capital</h1>
          <p className="text-white/40 font-bold text-[10px] uppercase tracking-[0.3em] font-bold">Deploy your assets into the investment pool</p>
        </header>

        {step === 1 && (
          <Card className="bg-card border-border shadow-2xl rounded-[2.5rem] overflow-hidden border-t-4 border-t-primary border">
            <CardHeader className="p-8 border-b border-border bg-white/5">
               <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
                 <Wallet className="size-6 text-primary" /> Setup Amount
               </CardTitle>
               <CardDescription className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-2 px-1">CHOOSE YOUR ASSET AND INVESTMENT VOLUME</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-10">
               <div className="space-y-4">
                  <Label className="text-[10px] text-white/40 font-black uppercase tracking-widest">Select Cryptocurrency</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {wallets.map(w => (
                       <div 
                         key={w.id} 
                         onClick={() => setSelectedWallet(w)}
                         className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex items-center justify-between group ${selectedWallet?.id === w.id ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10' : 'bg-card border-border hover:border-primary/30'}`}
                       >
                          <div className="flex items-center gap-4">
                             <div className={`size-14 rounded-2xl flex items-center justify-center font-black italic text-2xl transition-all ${selectedWallet?.id === w.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-white/5 text-white/20 border border-white/5'}`}>
                                {w.symbol[0]}
                             </div>
                             <div>
                                <div className={`font-black uppercase tracking-tighter italic text-lg ${selectedWallet?.id === w.id ? 'text-primary' : 'text-white/40'}`}>{w.currency}</div>
                                <div className="text-[10px] text-white/20 font-mono uppercase font-bold tracking-widest">{w.network}</div>
                             </div>
                          </div>
                          {selectedWallet?.id === w.id && <CheckCircle2 className="text-primary size-7 animate-in zoom-in" />}
                       </div>
                     ))}
                  </div>
               </div>

               <div className="space-y-4">
                  <Label className="text-[10px] text-white/40 font-black uppercase tracking-widest">Deposit Amount (USD)</Label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 size-10 bg-white/5 rounded-xl flex items-center justify-center border border-border group-focus-within:border-primary/40 transition-colors">
                      <DollarSign className="size-6 text-primary" />
                    </div>
                    <Input 
                      type="number" 
                      placeholder="e.g. 5000" 
                      className="bg-background border-border h-20 md:h-24 text-4xl md:text-5xl font-black font-mono text-white pl-20 md:pl-24 rounded-2xl md:rounded-[2rem] focus:ring-1 focus:ring-primary/20 shadow-inner placeholder:text-white/5"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 p-4 rounded-xl border border-border">
                     <ShieldCheck className="size-4 text-primary" />
                     <p className="text-[10px] text-white/40 font-black uppercase tracking-widest italic">Minimum Deposit Requirement: <span className="text-white font-black">$100.00</span></p>
                  </div>
               </div>

               <Button 
                 onClick={() => setStep(2)} 
                 disabled={!amount || parseFloat(amount) < 10 || !selectedWallet} 
                 className="w-full h-16 md:h-18 bg-primary text-primary-foreground font-black text-lg uppercase tracking-[0.1em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all hover:shadow-primary/40"
               >
                 NEXT STEP <ArrowRight className="ml-2 size-6" />
               </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && selectedWallet && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5">
            <Card className="bg-card border-border shadow-2xl rounded-[2.5rem] overflow-hidden border-t-4 border-t-primary border">
               <CardHeader className="text-center p-8 md:p-10 border-b border-border bg-white/5">
                  <CardTitle className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase vibrant-text">Final Audit</CardTitle>
                  <CardDescription className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-3">TRANSFER {amount} USD EQUIVALENT TO THE ADDRESS BELOW</CardDescription>
               </CardHeader>
               <CardContent className="flex flex-col items-center p-8 md:p-10 space-y-8 md:space-y-10">
                  <div className="p-8 bg-background rounded-[3rem] shadow-2xl relative group border-4 border-white/5">
                     {selectedWallet.qrCodeUrl ? (
                        <img src={selectedWallet.qrCodeUrl} alt="QR Code" className="size-[240px] object-contain rounded-xl" />
                     ) : (
                        <QRCodeSVG value={selectedWallet.address} size={240} className="rounded-xl" />
                     )}
                     <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] flex items-center justify-center backdrop-blur-[2px]">
                        <QrCode className="size-20 text-primary opacity-40 animate-pulse" />
                     </div>
                  </div>
                  
                  <div className="w-full space-y-10">
                    <div className="space-y-4 text-center">
                       <Label className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em]">Official {selectedWallet.currency} Repository ({selectedWallet.network})</Label>
                       <div className="flex items-center gap-3 bg-white/5 border-2 border-border p-6 rounded-[1.5rem] group relative overflow-hidden shadow-inner">
                          <div className="absolute inset-0 bg-primary opacity-[0.03] translate-x-[-100%] group-hover:translate-x-[0%] transition-transform duration-700" />
                          <span className="text-sm md:text-lg font-black font-mono break-all text-white flex-1 z-10 select-all px-2">{selectedWallet.address}</span>
                          <Button size="icon" variant="ghost" onClick={handleCopy} className="size-14 rounded-2xl bg-background text-primary border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all z-10 shadow-sm">
                            <Copy className="size-6" />
                          </Button>
                       </div>
                    </div>

                    <div className="bg-white/5 p-8 rounded-[2rem] border border-border space-y-4 relative overflow-hidden shadow-sm">
                       <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
                          <ShieldCheck className="size-20" />
                       </div>
                       <div className="flex items-center gap-3 text-primary relative z-10">
                          <ShieldCheck className="size-6" />
                          <span className="text-xs font-black uppercase tracking-widest italic">Security Directives</span>
                       </div>
                       <p className="text-[11px] text-white/40 font-bold leading-relaxed uppercase relative z-10">
                         {config?.depositInstruction || "Transfer the exact amount to the secured vault address above. Our automated auditing system will verify the block confirmation instantly."}
                       </p>
                    </div>

                    <div className="space-y-8 pt-10 border-t border-border">
                       <div className="space-y-4">
                          <Label className="text-[10px] text-white/40 font-black uppercase tracking-widest">Digital Signature Hash (TXID)</Label>
                          <div className="relative">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 size-8 bg-white/5 rounded-lg flex items-center justify-center border border-border">
                              <Wallet className="size-4 text-primary" />
                            </div>
                            <Input 
                              placeholder="PASTE BLOCKCHAIN HASH HERE" 
                              className="bg-background border-border h-16 pl-16 rounded-2xl font-mono text-sm uppercase tracking-widest text-white placeholder:text-white/5 shadow-sm font-bold"
                              value={txHash}
                              onChange={(e) => setTxHash(e.target.value)}
                            />
                          </div>
                       </div>
                       <div className="space-y-4">
                          <Label className="text-[10px] text-white/40 font-black uppercase tracking-widest">Upload Deposit Evidence (SCREENSHOT)</Label>
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
                                className="flex items-center justify-center gap-4 bg-white/5 border-2 border-border border-dashed py-16 rounded-[2.5rem] cursor-pointer hover:border-primary transition-all group overflow-hidden relative shadow-inner"
                             >
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                {isUploading ? (
                                  <div className="flex flex-col items-center gap-4">
                                    <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Uploading Ledger Data...</span>
                                  </div>
                                ) : receiptUrl ? (
                                  <div className="flex flex-col items-center gap-4 text-green-600 font-black uppercase tracking-[0.2em] animate-in zoom-in">
                                    <div className="size-16 bg-green-500/10 rounded-full flex items-center justify-center border border-green-100 shadow-lg shadow-green-100/50">
                                       <CheckCircle2 className="size-10" /> 
                                    </div>
                                    <span className="text-sm">Audit Evidence Logged</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-6 text-center">
                                     <div className="size-20 bg-background rounded-3xl flex items-center justify-center border border-border shadow-md group-hover:scale-110 transition-transform">
                                        <Upload className="size-10 text-white/20 group-hover:text-primary transition-colors" /> 
                                     </div>
                                     <div className="space-y-2">
                                       <span className="text-xs font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">Drop Proof or Click to Select</span>
                                       <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest">Accepted: PDF, PNG, JPG (MAX 5MB)</p>
                                     </div>
                                  </div>
                                )}
                             </Label>
                          </div>
                       </div>
                    </div>
                  </div>
                  
                  <div className="w-full flex flex-col gap-6 pt-6">
                    <Button 
                      onClick={handleSubmitDeposit} 
                      disabled={loading || !receiptUrl || !txHash} 
                      className="w-full h-16 md:h-20 bg-primary text-primary-foreground font-black text-sm md:text-lg uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-primary/30 hover:scale-[1.01] transition-all hover:shadow-primary/50"
                    >
                      {loading ? 'AUDITING TRANSACTION...' : 'DEPLOY CAPITAL NOW'}
                    </Button>
                    <Button variant="ghost" onClick={() => setStep(1)} className="w-full text-white/40 font-black uppercase text-xs tracking-widest hover:text-white transition-colors h-12">Return to Configuration</Button>
                  </div>
               </CardContent>
            </Card>
          </div>
        )}

        {step === 3 && (
          <Card className="bg-card border-border text-center py-24 rounded-[3.5rem] shadow-3xl border animate-in zoom-in duration-500">
             <CardContent className="space-y-10">
                <div className="size-32 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto ring-[16px] ring-green-500/10 shadow-lg shadow-green-500/10 animate-bounce">
                   <CheckCircle2 className="size-16" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter vibrant-text leading-tight">Syncing Processed</h2>
                  <p className="text-white/40 font-bold text-sm max-w-sm mx-auto leading-relaxed uppercase tracking-wide">
                    Your injection of <span className="text-white font-black underline decoration-primary decoration-4 underline-offset-4">${amount}</span> is scheduled for audit. 
                    Expect fulfillment within 30-60 minutes.
                  </p>
                </div>
                <div className="pt-10 flex flex-col items-center gap-4 max-w-sm mx-auto px-6">
                   <Button onClick={() => navigate('/transactions')} className="w-full h-16 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all text-xs">AUDIT LOGS</Button>
                   <Button variant="ghost" onClick={() => navigate('/dashboard')} className="w-full uppercase text-xs font-black tracking-[0.2em] text-white/40 hover:text-white">BACK TO CORE</Button>
                </div>
             </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
