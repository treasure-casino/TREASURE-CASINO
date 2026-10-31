import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { AdminUser } from '../types';

interface AuthContextType {
  admin: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('treasure_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('treasure_admin_token');
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('treasure_admin_token');
      if (storedToken) {
        try {
          const res = await apiClient.get('/api/admin/auth/me');
          if (res.data.success && res.data.data) {
            setAdmin(res.data.data);
            localStorage.setItem('treasure_admin_user', JSON.stringify(res.data.data));
          } else {
            logout();
          }
        } catch {
          logout();
        }
      } else {
        setAdmin(null);
        setToken(null);
      }
      setLoading(false);
    };

    verifyAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post('/api/admin/auth/login', { email, password });
    if (res.data.success && res.data.data) {
      const { token: newToken, admin: adminData } = res.data.data;
      setToken(newToken);
      setAdmin(adminData);
      localStorage.setItem('treasure_admin_token', newToken);
      localStorage.setItem('treasure_admin_user', JSON.stringify(adminData));
    } else {
      throw new Error(res.data.error || 'Authentication failed');
    }
  };

  const logout = () => {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem('treasure_admin_token');
    localStorage.removeItem('treasure_admin_user');
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!token && !!admin,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

