import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import type { AuthUser } from '../api/client';
import { createLogger } from '../utils/logger';
const log = createLogger('auth');

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
    log.debug('refreshUser: fetching current user');
    try {
      const me = await api.auth.me();
      log.info(`refreshUser: authenticated as ${me.email} (id=${me.id})`);
      setUser(me);
    } catch (err) {
      log.warn('refreshUser: token invalid or expired — clearing session', err);
      setUser(null);
      localStorage.removeItem('auth_token');
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    log.debug(`auth init: token present=${!!token}`);
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      log.info('auth init: no token — user is anonymous');
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    log.info(`login: attempting login for ${email}`);
    const resp = await api.auth.login(email, password);
    localStorage.setItem('auth_token', resp.token);
    setUser(resp.user);
    log.info(`login: success — user id=${resp.user.id} email=${resp.user.email}`);
  };

  const register = async (email: string, password: string, name: string) => {
    log.info(`register: creating account for ${email}`);
    const resp = await api.auth.register(email, password, name);
    localStorage.setItem('auth_token', resp.token);
    setUser(resp.user);
    log.info(`register: success — user id=${resp.user.id}`);
  };

  const logout = () => {
    log.info(`logout: user=${user?.email ?? 'unknown'} clearing session`);
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
