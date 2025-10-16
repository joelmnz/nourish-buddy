import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import { AuthContext } from './auth-context';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const { authenticated, username: user } = await api.auth.me();
      setIsAuthenticated(authenticated);
      setUsername(user || null);
    } catch {
      setIsAuthenticated(false);
      setUsername(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    await api.auth.login(username, password);
    await checkAuth();
  };

  const logout = async () => {
    await api.auth.logout();
    setIsAuthenticated(false);
    setUsername(null);
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
