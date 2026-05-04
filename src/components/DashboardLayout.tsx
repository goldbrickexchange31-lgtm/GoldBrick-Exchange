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
  Settings
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { auth } from '../lib/firebase';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { userData } = useAuth();
  const navigate = useNavigate();

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

  const adminEmails = ['btechtools.ng@gmail.com', 'goldbrickexchange31@gmail.com'];
  const isAdmin = userData?.role === 'admin' || (auth.currentUser?.email && adminEmails.includes(auth.currentUser.email));

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Floating Support Button */}
      <Link 
        to="/support"
        className="fixed bottom-24 right-6 z-[60] md:bottom-8 md:right-8 bg-primary w-14 h-14 rounded-full flex items-center justify-center shadow-2xl shadow-primary/30 hover:scale-110 transition-transform cursor-pointer gold-glow"
      >
        <MessageSquare className="text-black w-7 h-7" />
      </Link>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-zinc-900 bg-black sticky top-0 z-50">
        <Link to="/dashboard">
          <Logo className="h-8" />
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </Button>
      </header>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-zinc-950 border-r border-zinc-900 transition-transform md:translate-x-0 md:static
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
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                  ${location.pathname === item.path ? 'bg-primary text-black font-bold' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}

            {isAdmin && (
              <Link 
                to="/admin"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-900 hover:text-white"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Settings className="w-5 h-5" />
                Admin Panel
              </Link>
            )}

            <button 
              onClick={handleLogout}
              className="md:hidden flex items-center gap-3 w-full px-4 py-3 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </nav>

          <div className="p-4 border-t border-zinc-900 hidden md:block">
             <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-red-500 hover:bg-red-500/10" onClick={handleLogout}>
                <LogOut className="w-5 h-5 mr-3" />
                Logout
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-950 border-t border-zinc-900 flex items-center justify-around px-4 z-50">
        <Link to="/dashboard" className={`flex flex-col items-center gap-1 ${location.pathname === '/dashboard' ? 'text-primary' : 'text-zinc-500'}`}>
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px]">Home</span>
        </Link>
        <Link to="/invest" className={`flex flex-col items-center gap-1 ${location.pathname === '/invest' ? 'text-primary' : 'text-zinc-500'}`}>
          <BarChart3 className="w-6 h-6" />
          <span className="text-[10px]">Invest</span>
        </Link>
        <Link to="/deposit" className="flex flex-col items-center -mt-8">
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/20 border-4 border-black">
            <ArrowDownLeft className="text-black w-7 h-7" />
          </div>
          <span className="text-[10px] mt-1 text-primary">Deposit</span>
        </Link>
        <Link to="/withdraw" className={`flex flex-col items-center gap-1 ${location.pathname === '/withdraw' ? 'text-primary' : 'text-zinc-500'}`}>
          <ArrowUpRight className="w-6 h-6" />
          <span className="text-[10px]">Withdraw</span>
        </Link>
        <Link to="/transactions" className={`flex flex-col items-center gap-1 ${location.pathname === '/transactions' ? 'text-primary' : 'text-zinc-500'}`}>
          <History className="w-6 h-6" />
          <span className="text-[10px]">History</span>
        </Link>
      </nav>
    </div>
  );
}
