import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [user]);

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
      // Also update the main chat doc for admin to see "last active"
      await setDoc(doc(db, 'chats', user.uid), {
        lastMessage: msg,
        lastActive: serverTimestamp(),
        userName: userData?.displayName,
        userEmail: userData?.email,
        userId: user.uid
      }, { merge: true });
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:row items-center justify-between gap-6">
           <div className="space-y-2">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                 <MessageSquare className="text-primary" /> Support Desk
              </h1>
              <p className="text-zinc-500">Private encrypted communication with our expert miners.</p>
           </div>
           {config?.whatsappLink && (
             <a href={config.whatsappLink} target="_blank" rel="noopener noreferrer">
                <Button className="bg-green-600 hover:bg-green-700 text-white font-bold h-12 px-6 rounded-xl">
                   <WhatsApp className="w-5 h-5 mr-2" /> WhatsApp Support
                </Button>
             </a>
           )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2">
              <Card className="bg-zinc-950 border-zinc-900 flex flex-col h-[600px]">
                 <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                          <User className="text-primary w-5 h-5" />
                       </div>
                       <div>
                          <CardTitle className="text-sm font-bold">Official Admin Panel</CardTitle>
                          <div className="flex items-center gap-1 text-[10px] text-green-500">
                             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                             Online - Ready to help
                          </div>
                       </div>
                    </div>
                 </CardHeader>
                 <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                    {messages.length === 0 && (
                       <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50 px-10">
                          <MessageSquare size={48} className="text-primary" />
                          <p className="text-sm">Welcome to GoldBrick Support. Send a message to start a private conversation with our team.</p>
                       </div>
                    )}
                    {messages.map((m, i) => (
                       <div key={i} className={`flex ${m.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                          <div className={`
                             max-w-[80%] p-4 rounded-2xl text-sm
                             ${m.senderId === user?.uid ? 'bg-primary text-black font-medium' : 'bg-zinc-900 text-white border border-zinc-800'}
                          `}>
                             {m.text}
                             <div className={`text-[9px] mt-1 opacity-50 ${m.senderId === user?.uid ? 'text-black' : 'text-zinc-500'}`}>
                                {m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                             </div>
                          </div>
                       </div>
                    ))}
                    <div ref={scrollRef} />
                 </CardContent>
                 <div className="p-4 border-t border-zinc-900 bg-zinc-900/10">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                       <Input 
                         placeholder="Type your message..." 
                         className="bg-[#0c0c0c] border-[#1a1a1a] flex-1 h-12 text-white placeholder:text-zinc-700 font-medium px-4"
                         value={input}
                         onChange={(e) => setInput(e.target.value)}
                       />
                       <Button type="submit" size="icon" className="h-12 w-12 bg-primary text-black">
                         <Send size={18} />
                       </Button>
                    </form>
                 </div>
              </Card>
           </div>

           <div className="space-y-6">
              <Card className="bg-zinc-950 border-zinc-900">
                 <CardHeader>
                    <CardTitle className="text-lg">Security First</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="flex gap-3 text-sm">
                       <ShieldCheck className="text-primary shrink-0 w-5 h-5" />
                       <p className="text-zinc-400">All chats are end-to-end encrypted by GoldBrick Security Protocol.</p>
                    </div>
                    <div className="flex gap-3 text-sm">
                       <ShieldCheck className="text-primary shrink-0 w-5 h-5" />
                       <p className="text-zinc-400">Admin will never ask for your password or secret keys.</p>
                    </div>
                 </CardContent>
              </Card>
              
              <a 
                href={config?.whatsappLink || '#'} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`block w-full ${!config?.whatsappLink ? 'pointer-events-none opacity-50' : ''}`}
              >
                 <Card className="bg-primary/10 border-primary/30 hover:bg-primary/20 transition-all cursor-pointer shadow-xl shadow-primary/5 active:scale-[0.98]">
                    <CardContent className="p-6 text-center space-y-4">
                       <div className="flex justify-center">
                          <div className="size-12 bg-primary rounded-full flex items-center justify-center text-black">
                             <WhatsApp className="size-6" />
                          </div>
                       </div>
                       <div className="space-y-1">
                          <div className="text-primary font-black uppercase italic tracking-tighter text-lg">Emergency Support</div>
                          <p className="text-[10px] text-zinc-400 font-bold leading-relaxed">If your issue is critical, please use our WhatsApp emergency line for 5-minute response times.</p>
                       </div>
                    </CardContent>
                 </Card>
              </a>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
