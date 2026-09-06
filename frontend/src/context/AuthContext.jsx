import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'valerie_auth_token_v1';
const USER_KEY  = 'valerie_auth_user_v1';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register' | 'admin'

  // Persist auth state to localStorage
  useEffect(() => {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch (e) {
      console.warn('Failed to sync auth state to localStorage:', e);
    }
  }, [token, user]);

  /**
   * Log in as customer or admin
   */
  const login = async ({ email, password, isAdminPortal = false }) => {
    const data = await apiService.login({ email, password, isAdminPortal });
    setToken(data.token);
    setUser(data.user);
    setIsAuthModalOpen(false);
    return data.user;
  };

  /**
   * Register a new customer account
   */
  const register = async ({ name, email, phone, password }) => {
    const data = await apiService.register({ name, email, phone, password });
    setToken(data.token);
    setUser(data.user);
    setIsAuthModalOpen(false);
    return data.user;
  };

  /**
   * Log out active session
   */
  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const openAuthModal = (mode = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const isAuthenticated = Boolean(token && user);
  const isAdmin = Boolean(user && user.role === 'admin');
  const isStaff = Boolean(user && (user.role === 'admin' || user.role === 'staff'));

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isStaff,
        isAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
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
