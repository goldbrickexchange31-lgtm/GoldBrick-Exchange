import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { MessageSquare, Send, Phone as WhatsApp, User, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { toast } from 'sonner';

export default function SupportPage() {
  const { user, userData } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [config, setConfig] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'chats', user.uid, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(doc => doc.data()));
    });
    return () => unsub();
  }, [user]);

  // Handle load scroll and new messages
  useEffect(() => {
    if (messages.length > 0) {
      // Small timeout to allow DOM to render
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, [messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const msg = input;
    setInput('');
    
    try {
      await addDoc(collection(db, 'chats', user.uid, 'messages'), {
        text: msg,
        senderId: user.uid,
        senderName: userData?.displayName,
        createdAt: serverTimestamp()
      });
      // Force scroll on send
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      // Also update the main chat doc for admin to see "last active"
      await setDoc(doc(db, 'chats', user.uid), {
        lastMessage: msg,
        lastActive: serverTimestamp(),
        userName: userData?.displayName,
        userEmail: userData?.email,
        userId: user.uid,
        unreadByAdmin: true
      }, { merge: true });
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-12 pb-12">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
           <div className="space-y-3">
              <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase vibrant-text leading-tight flex items-center gap-4">
                 <MessageSquare className="text-primary size-8 md:size-12" /> Support Hub
              </h1>
              <p className="text-white/40 font-bold text-[10px] md:text-xs uppercase tracking-widest leading-relaxed max-w-xl">
                Encrypted point-to-point communication with GoldBrick elite support staff. 
                Average response time: <span className="text-primary underline decoration-primary/30">under 15 minutes</span>.
              </p>
           </div>
           {config?.whatsappLink && (
             <a href={config.whatsappLink} target="_blank" rel="noopener noreferrer" className="w-full lg:w-auto">
                <Button className="w-full lg:w-auto bg-[#25D366] hover:bg-[#128C7E] text-white font-black h-16 px-10 rounded-2xl shadow-xl shadow-green-100 flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 uppercase text-xs tracking-widest">
                   <WhatsApp className="size-6" /> WhatsApp Support
                </Button>
             </a>
           )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            <div className="xl:col-span-2">
              <Card className="bg-card border-border flex flex-col h-[650px] shadow-2xl rounded-[3rem] overflow-hidden border">
                 <CardHeader className="border-b border-border bg-white/5 p-8">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="size-12 bg-background rounded-2xl border border-border shadow-sm flex items-center justify-center">
                             <User className="text-primary size-6" />
                          </div>
                          <div>
                             <CardTitle className="text-lg font-black text-white italic uppercase tracking-tighter">Secure Terminal</CardTitle>
                             <div className="flex items-center gap-2 text-[10px] text-green-600 font-black uppercase tracking-widest">
                                <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                                Active Priority Queue
                             </div>
                          </div>
                       </div>
                       <Badge className="bg-primary/10 text-primary border-none font-black px-4 py-1.5 rounded-full uppercase text-[9px] tracking-widest shadow-sm">End-to-End Encrypted</Badge>
                    </div>
                 </CardHeader>
                 
                 <CardContent className="flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar bg-white/5">
                    {messages.length === 0 && (
                       <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30 px-12">
                          <div className="size-24 bg-primary/10 rounded-full flex items-center justify-center">
                             <MessageSquare size={48} className="text-primary" />
                          </div>
                          <div className="space-y-2">
                             <h4 className="text-xl font-black italic uppercase text-white">Establish Link</h4>
                             <p className="text-xs font-bold text-white/40 uppercase tracking-wide leading-relaxed max-w-xs">Initialize a private session with our wealth management audit team.</p>
                          </div>
                       </div>
                    )}
                    {messages.map((m, i) => (
                       <div key={i} className={`flex ${m.senderId === user?.uid ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                          <div className={`
                             max-w-[85%] p-6 rounded-3xl text-sm shadow-sm
                             ${m.senderId === user?.uid 
                                ? 'bg-primary text-primary-foreground font-bold rounded-tr-none shadow-lg shadow-primary/10' 
                                : 'bg-background text-white/80 border border-border rounded-tl-none font-medium'}
                          `}>
                             <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                             <div className={`text-[8px] mt-4 font-black uppercase tracking-widest ${m.senderId === user?.uid ? 'text-primary-foreground/60 text-right font-mono' : 'text-white/20 font-mono'}`}>
                                {m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TRANSMITTING...'}
                             </div>
                          </div>
                       </div>
                    ))}
                    <div ref={scrollRef} />
                 </CardContent>

                 <div className="p-8 border-t border-border bg-background shrink-0">
                    <form onSubmit={handleSendMessage} className="flex gap-4">
                       <Input 
                         placeholder="Communicate your request..." 
                         className="bg-white/5 border-border flex-1 h-16 text-white placeholder:text-white/20 font-bold px-8 rounded-2xl shadow-inner border-2 italic text-lg"
                         value={input}
                         onChange={(e) => setInput(e.target.value)}
                       />
                       <Button type="submit" size="icon" className="size-16 bg-primary text-primary-foreground rounded-2xl shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all">
                         <Send size={24} />
                       </Button>
                    </form>
                 </div>
              </Card>
           </div>

           <div className="space-y-8">
              <Card className="bg-card border-border shadow-xl rounded-[2.5rem] border-t-4 border-t-primary border">
                 <CardHeader className="p-8 pb-0">
                    <CardTitle className="text-xl font-black italic uppercase tracking-tighter text-white">GoldBrick Directives</CardTitle>
                 </CardHeader>
                 <CardContent className="p-8 space-y-6">
                    <div className="flex gap-4 p-5 bg-white/5 rounded-2xl border border-border group hover:border-primary/20 transition-all">
                       <ShieldCheck className="text-primary size-6 shrink-0 mt-0.5" />
                       <div className="space-y-1">
                          <h5 className="font-black italic uppercase text-xs text-white">Zero-Trust Protocol</h5>
                          <p className="text-[10px] text-white/40 font-bold leading-relaxed uppercase tracking-tight">Our staff will NEVER ask for passwords, private keys, or seed phrases.</p>
                       </div>
                    </div>
                    <div className="flex gap-4 p-5 bg-white/5 rounded-2xl border border-border group hover:border-primary/20 transition-all">
                       <WhatsApp className="text-green-500 size-6 shrink-0 mt-0.5" />
                       <div className="space-y-1">
                          <h5 className="font-black italic uppercase text-xs text-white">Priority Uplink</h5>
                          <p className="text-[10px] text-white/40 font-bold leading-relaxed uppercase tracking-tight">Use the WhatsApp link for immediate assistance regarding pending deposits.</p>
                       </div>
                    </div>
                 </CardContent>
              </Card>
              
              <a 
                href={config?.whatsappLink || '#'} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => {
                  if (!config?.whatsappLink) {
                    e.preventDefault();
                    toast.info('Emergency support is only available via the direct link provided by our administrators.');
                  }
                }}
                className={`block group transition-all active:scale-95 ${!config?.whatsappLink ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                 <Card className={`bg-card border-border shadow-2xl rounded-[2.5rem] overflow-hidden transition-all duration-500 border ${config?.whatsappLink ? 'hover:border-primary/50 hover:bg-white/5' : ''}`}>
                    <div className={`h-2 bg-[#25D366] transition-all duration-700 ${config?.whatsappLink ? 'group-hover:h-3' : 'grayscale'}`} />
                    <CardContent className="p-10 text-center space-y-6">
                       <div className="flex justify-center">
                          <div className={`size-20 rounded-3xl flex items-center justify-center transition-transform duration-700 ${config?.whatsappLink ? 'bg-[#25D366] text-white shadow-2xl shadow-green-200 group-hover:rotate-12' : 'bg-white/5 text-slate-300'}`}>
                             <WhatsApp className="size-10" />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <div className={`font-black uppercase italic tracking-tighter text-2xl ${config?.whatsappLink ? 'vibrant-text' : 'text-white/20'}`}>Emergency Support</div>
                          <p className="text-[11px] text-white/40 font-bold leading-relaxed uppercase tracking-widest max-w-[240px] mx-auto italic">
                            Critical response unit available 24/7 for account security and liquidity inquiries.
                          </p>
                       </div>
                       <Button 
                         variant="ghost" 
                         disabled={!config?.whatsappLink}
                         className={`w-full font-black uppercase text-[10px] tracking-[0.3em] h-12 rounded-2xl ${config?.whatsappLink ? 'text-primary hover:bg-primary/5 border border-primary/20' : 'text-white/20 border border-white/10'}`}
                       >
                         {config?.whatsappLink ? 'INITIATE UPLINK' : 'LINK STANDBY'}
                       </Button>
                    </CardContent>
                 </Card>
              </a>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
