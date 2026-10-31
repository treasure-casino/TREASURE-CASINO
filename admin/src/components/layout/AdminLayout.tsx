import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Loader2 } from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center text-gold">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <span className="text-sm tracking-widest font-cinzel">VERIFYING ADMIN SESSION...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-dark-950 text-gray-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-64">
        <Navbar />
        <main className="flex-1 pt-20 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

