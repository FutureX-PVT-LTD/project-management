'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AuthUser, UserRole } from '@futurex/shared';
import { api } from '@/services/api/api-client';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string, returnTo?: string | null, rememberMe?: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res);
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const tabId = React.useMemo(() => Math.random().toString(36).substring(2), []);
  const channelRef = React.useRef<BroadcastChannel | null>(null);
  const isInitialized = React.useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('futurex-auth');
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent) => {
      // Ignore auth change notifications originating from this tab
      if (event.data?.sender === tabId) return;

      queryClient.clear();
      window.location.reload();
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [queryClient, tabId]);

  const notifyAuthChange = useCallback(() => {
    const payload = { type: 'changed', sender: tabId };
    if (channelRef.current) {
      channelRef.current.postMessage(payload);
    } else if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('futurex-auth');
      channel.postMessage(payload);
      channel.close();
    }
  }, [tabId]);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      refreshUser();
    }
  }, [refreshUser]);

  const login = async (
    email: string,
    password: string,
    returnTo?: string | null,
    rememberMe?: boolean,
  ): Promise<AuthUser> => {
    const res = await api.post('/auth/login', { email, password, rememberMe });
    const authenticatedUser: AuthUser = res.user;
    setUser(authenticatedUser);

    // Clear any previous query cache before fresh navigation
    queryClient.clear();
    notifyAuthChange();

    // Validate and handle safe redirection
    if (returnTo && /^\/(?!\/)/.test(returnTo) && !/[\\\u0000-\u0020]/.test(returnTo)) {
      router.push(returnTo);
    } else {
      // Role-based landing redirection
      if (authenticatedUser.globalRole === UserRole.TEAM_MEMBER) {
        router.push('/my-work');
      } else {
        router.push('/dashboard');
      }
    }

    return authenticatedUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      notifyAuthChange();
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      queryClient.clear();
      isInitialized.current = false;
      setUser(null);
      router.push('/login');
    }
  };

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false;
    if (user.globalRole === UserRole.OWNER) return true;
    return roles.includes(user.globalRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshUser,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
