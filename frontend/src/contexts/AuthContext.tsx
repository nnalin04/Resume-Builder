import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import type { AuthUser } from '../api/client';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      setUser(null);
      localStorage.removeItem('auth_token');
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const resp = await api.auth.login(email, password);
    localStorage.setItem('auth_token', resp.token);
    setUser(resp.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const resp = await api.auth.register(email, password, name);
    localStorage.setItem('auth_token', resp.token);
    setUser(resp.user);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
