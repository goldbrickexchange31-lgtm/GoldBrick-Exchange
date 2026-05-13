import { Logo } from './Logo';
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { 
  BarChart3, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Users, 
  MessageSquare, 
  Menu, 
  X, 
  LayoutDashboard,
  LogOut,
  Settings,
  Download
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { auth } from '../lib/firebase';
import { usePWAInstall } from '../hooks/usePWAInstall';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const { isInstallable, handleInstallClick } = usePWAInstall();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Invest', icon: BarChart3, path: '/invest' },
    { name: 'Deposit', icon: ArrowDownLeft, path: '/deposit' },
    { name: 'Withdraw', icon: ArrowUpRight, path: '/withdraw' },
    { name: 'Transactions', icon: History, path: '/transactions' },
    { name: 'Referrals', icon: Users, path: '/referrals' },
    { name: 'Support', icon: MessageSquare, path: '/support' },
  ];

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  const adminEmails = ['goldbrickexchange31@gmail.com'];
  const isAdmin = userData?.role === 'admin' || (auth.currentUser?.email && adminEmails.includes(auth.currentUser.email));

  return (
    <div className="min-h-screen bg-background text-white flex flex-col md:flex-row pb-20 md:pb-0 font-sans">
      {/* Floating Support Button */}
      <Link 
        to="/support"
        className="fixed bottom-24 right-6 z-[60] md:bottom-8 md:right-8 bg-primary w-14 h-14 rounded-full flex items-center justify-center shadow-2xl shadow-primary/30 hover:scale-110 transition-transform cursor-pointer"
      >
        <MessageSquare className="text-primary-foreground w-7 h-7" />
      </Link>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-50">
        <Link to="/dashboard">
          <Logo className="h-8" />
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white">
          {isSidebarOpen ? <X /> : <Menu />}
        </Button>
      </header>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transition-transform md:translate-x-0 md:static
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 hidden md:block">
            <Link to="/dashboard">
              <Logo className="h-10" />
            </Link>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-2">
            {menuItems.map((item) => (
              <Link 
                key={item.name} 
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${location.pathname === item.path 
                    ? 'bg-primary text-primary-foreground font-black italic shadow-lg shadow-primary/20' 
                    : 'text-white/40 hover:bg-white/5 hover:text-white'}
                `}
              >
                <item.icon className={`w-5 h-5 ${location.pathname === item.path ? 'text-white' : 'text-primary'}`} />
                <span className="text-xs font-black uppercase tracking-widest">{item.name}</span>
              </Link>
            ))}

            {isAdmin && (
              <Link 
                to="/admin"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:bg-white/5 hover:text-white"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Settings className="w-5 h-5 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest">Admin Panel</span>
              </Link>
            )}

            {isInstallable && (
              <button 
                onClick={handleInstallClick}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-primary font-black animate-pulse hover:bg-primary/10 transition-all border border-primary/20"
              >
                <Download className="w-5 h-5" />
                <span className="text-xs uppercase tracking-widest">Download App</span>
              </button>
            )}

            <button 
              onClick={handleLogout}
              className="md:hidden flex items-center gap-3 w-full px-4 py-3 rounded-xl text-white/40 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">Logout</span>
            </button>
          </nav>

          <div className="p-4 border-t border-border hidden md:block space-y-2">
             {isInstallable && (
               <Button 
                 onClick={handleInstallClick}
                 className="w-full justify-start bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all rounded-xl animate-pulse"
               >
                  <Download className="w-5 h-5 mr-3" />
                  <span className="text-xs font-black uppercase tracking-widest">Download App</span>
               </Button>
             )}
             <Button variant="ghost" className="w-full justify-start text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-xl" onClick={handleLogout}>
                <LogOut className="w-5 h-5 mr-3" />
                <span className="text-xs font-black uppercase tracking-widest">Logout</span>
             </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Quick Footer for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-4 z-50">
        <Link to="/dashboard" className={`flex flex-col items-center gap-1 ${location.pathname === '/dashboard' ? 'text-primary' : 'text-white/40'}`}>
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase">Home</span>
        </Link>
        <Link to="/invest" className={`flex flex-col items-center gap-1 ${location.pathname === '/invest' ? 'text-primary' : 'text-white/40'}`}>
          <BarChart3 className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase">Invest</span>
        </Link>
        <Link to="/deposit" className="flex flex-col items-center -mt-8">
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-background">
            <ArrowDownLeft className="text-white w-7 h-7" />
          </div>
          <span className="text-[10px] mt-1 text-primary font-black uppercase">Deposit</span>
        </Link>
        <Link to="/withdraw" className={`flex flex-col items-center gap-1 ${location.pathname === '/withdraw' ? 'text-primary' : 'text-white/40'}`}>
          <ArrowUpRight className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase">Withdraw</span>
        </Link>
        <Link to="/transactions" className={`flex flex-col items-center gap-1 ${location.pathname === '/transactions' ? 'text-primary' : 'text-white/40'}`}>
          <History className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase">History</span>
        </Link>
      </nav>
    </div>
  );
}
