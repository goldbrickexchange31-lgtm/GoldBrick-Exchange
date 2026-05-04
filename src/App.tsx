import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './lib/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import InvestPage from './pages/InvestPage';
import DepositPage from './pages/DepositPage';
import WithdrawPage from './pages/WithdrawPage';
import TransactionsPage from './pages/TransactionsPage';
import AdminLogin from './pages/AdminLogin';

import ReferralsPage from './pages/ReferralsPage';
import SupportPage from './pages/SupportPage';
import TermsPage from './pages/TermsPage';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, userData, loading } = useAuth();
  const ADMIN_EMAILS = ['btechtools.ng@gmail.com', 'goldbrickexchange31@gmail.com'];

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-black"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div></div>;
  if (!user) return <Navigate to="/login" />;
  
  const isUserAdmin = userData?.role === 'admin' || (user?.email && ADMIN_EMAILS.includes(user.email));
  if (adminOnly && !isUserAdmin) return <Navigate to="/dashboard" />;

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/invest" element={<ProtectedRoute><InvestPage /></ProtectedRoute>} />
      <Route path="/deposit" element={<ProtectedRoute><DepositPage /></ProtectedRoute>} />
      <Route path="/withdraw" element={<ProtectedRoute><WithdrawPage /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
      <Route path="/referrals" element={<ProtectedRoute><ReferralsPage /></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
      
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/terms" element={<TermsPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
        <Toaster position="top-right" expand={true} richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
