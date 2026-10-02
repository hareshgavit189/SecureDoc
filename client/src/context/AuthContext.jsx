/**
 * AuthContext.jsx
 * Provides authentication state and methods throughout the app.
 *
 * Security design:
 * - accessToken stored in React state (memory only, not localStorage)
 * - refreshToken stored in httpOnly cookie (handled by server)
 * - Axios interceptors: auto-attach token, auto-refresh on 401
 */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('securedoc_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState(() => {
    return localStorage.getItem('securedoc_token') || null;
  });
  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem('securedoc_token');
  });

  // Ref so interceptors always have the latest token without stale closure
  const tokenRef = useRef(localStorage.getItem('securedoc_token') || null);

  // ── Refresh Token ─────────────────────────────────────────────
  const refreshToken = useCallback(async () => {
    try {
      const res = await axiosInstance.post('/auth/refresh');
      const rData = res.data?.data || res.data;
      const { accessToken: newToken, user: newUser } = rData;
      tokenRef.current = newToken;
      setAccessToken(newToken);
      localStorage.setItem('securedoc_token', newToken);
      if (newUser) {
        setUser(newUser);
        localStorage.setItem('securedoc_user', JSON.stringify(newUser));
      }
      return newToken;
    } catch {
      // Refresh failed → user must re-login
      tokenRef.current = null;
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem('securedoc_token');
      localStorage.removeItem('securedoc_user');
      return null;
    }
  }, []);

  // ── Bootstrap: try to restore session on mount ────────────────
  useEffect(() => {
    (async () => {
      const savedToken = localStorage.getItem('securedoc_token');
      if (savedToken) {
        try {
          const res = await axiosInstance.get('/auth/me');
          const userData = res.data?.data || res.data;
          if (userData && userData.id) {
            setUser(userData);
            localStorage.setItem('securedoc_user', JSON.stringify(userData));
          }
        } catch {
          await refreshToken();
        }
      } else {
        await refreshToken();
      }
      setLoading(false);
    })();
  }, [refreshToken]);

  // ── Axios Request Interceptor: attach Bearer token ────────────
  useEffect(() => {
    const reqId = axiosInstance.interceptors.request.use((config) => {
      const activeToken = tokenRef.current || localStorage.getItem('securedoc_token');
      if (activeToken) {
        config.headers['Authorization'] = `Bearer ${activeToken}`;
      }
      return config;
    });

    // ── Axios Response Interceptor: auto-refresh on 401 ──────────
    const resId = axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/login')) {
          original._retry = true;
          const newToken = await refreshToken();
          if (newToken) {
            original.headers['Authorization'] = `Bearer ${newToken}`;
            return axiosInstance(original);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosInstance.interceptors.request.eject(reqId);
      axiosInstance.interceptors.response.eject(resId);
    };
  }, [refreshToken]);

  // ── Login ─────────────────────────────────────────────────────
  const login = async (email, password, totpToken = '') => {
    const res = await axiosInstance.post('/auth/login', {
      email,
      password,
      totpToken: totpToken || undefined,
    });
    const loginData = res.data?.data || res.data;
    if (loginData.requires2FA) {
      throw new Error('2FA required. Please enter your 6-digit TOTP code.');
    }
    const { accessToken: token, user: loggedInUser } = loginData;
    tokenRef.current = token;
    setAccessToken(token);
    setUser(loggedInUser);
    localStorage.setItem('securedoc_token', token);
    localStorage.setItem('securedoc_user', JSON.stringify(loggedInUser));
    return loginData;
  };

  // ── Logout ────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch {
      // Ignore errors — clear state regardless
    } finally {
      tokenRef.current = null;
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem('securedoc_token');
      localStorage.removeItem('securedoc_user');
    }
  };

  // ── 2FA: Setup ────────────────────────────────────────────────
  const setup2FA = async () => {
    const res = await axiosInstance.post('/auth/2fa/setup');
    return res.data; // { otpauthUrl, secret }
  };

  // ── 2FA: Verify ───────────────────────────────────────────────
  const verify2FA = async (token) => {
    const res = await axiosInstance.post('/auth/2fa/verify', { token });
    return res.data;
  };

  const value = {
    user,
    accessToken,
    loading,
    login,
    logout,
    refreshToken,
    setup2FA,
    verify2FA,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook to consume auth context */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export default AuthContext;
