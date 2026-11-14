import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, type User } from '../api/client';

interface AuthState {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email.trim(), password);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      // Logging out locally must still work even if the server call fails.
      await api.logout(token).catch(() => undefined);
    }
    setToken(null);
    setUser(null);
  }, [token]);

  const value = useMemo(() => ({ token, user, login, logout }), [token, user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
