'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, UserProfileData, loginUser, getCurrentUser, logoutUser, updateUserProfile } from '../lib/api/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: UserProfileData) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  updateProfile: async () => ({ success: false }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function initAuth() {
      if (typeof window === 'undefined') return;
      const storedToken = localStorage.getItem('auth_token');

      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      setToken(storedToken);
      const result = await getCurrentUser(storedToken);

      if (result.success && result.user) {
        setUser(result.user);
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        setUser(null);
        setToken(null);
      }
      setIsLoading(false);
    }

    initAuth();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    const res = await loginUser(email, password);

    if (res.success && res.data) {
      setUser(res.data.user);
      setToken(res.data.accessToken);
      localStorage.setItem('auth_token', res.data.accessToken);
      localStorage.setItem('refresh_token', res.data.refreshToken);
      localStorage.setItem('user_info', JSON.stringify(res.data.user));
      setIsLoading(false);
      router.push('/dashboard');
      return { success: true };
    }

    setIsLoading(false);
    return { success: false, error: res.error || 'Invalid credentials' };
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await logoutUser();
    setUser(null);
    setToken(null);
    setIsLoading(false);
    router.push('/');
  };

  const handleUpdateProfile = async (data: UserProfileData) => {
    const res = await updateUserProfile(data);
    if (res.success && res.user) {
      setUser(res.user);
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to update profile' };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login: handleLogin,
        logout: handleLogout,
        updateProfile: handleUpdateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
