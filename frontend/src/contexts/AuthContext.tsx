/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User } from '../types/curio';
import { loginUser, loginWithOAuthToken, registerUser } from '../actions/authActions';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  activeTab: 'home' | 'discover' | 'search' | 'library' | 'interests' | 'settings';
  isMenuOpen: boolean;
  isLoadingUserData: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithOAuth: (oauthToken: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  changeTab: (tab: AuthContextType['activeTab']) => void;
  setMenuOpen: (open: boolean) => void;
  updateUser: (u: User) => void;
  setLoadingUserData: (v: boolean) => void;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthState {
  user: User | null;
  token: string | null;
  activeTab: AuthContextType['activeTab'];
  isMenuOpen: boolean;
  isLoadingUserData: boolean;
}

const INITIAL_AUTH: AuthState = { user: null, token: null, activeTab: 'home', isMenuOpen: false, isLoadingUserData: false };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('curio_token');
    return {
      user: null,
      token,
      activeTab: 'home',
      isMenuOpen: false,
      // Mark as loading if we have a token — BootstrapContext will clear this
      isLoadingUserData: !!token,
    };
  });

  // Clear stale tokens on mount if the token is invalid
  // (BootstrapContext will handle the actual /bootstrap fetch)
  useEffect(() => {
    if (!state.token) {
      setState((p) => ({ ...p, isLoadingUserData: false }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (username: string, password: string) => {
    const result = await loginUser(username, password);
    localStorage.setItem('curio_token', result.token);
    setState((p) => ({ ...p, token: result.token, user: result.user }));
  }, []);

  const loginWithOAuth = useCallback(async (oauthToken: string) => {
    const result = await loginWithOAuthToken(oauthToken);
    localStorage.setItem('curio_token', result.token);
    setState((p) => ({ ...p, token: result.token, user: result.user }));
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const result = await registerUser(email, username, password);
    localStorage.setItem('curio_token', result.token);
    setState((p) => ({ ...p, token: result.token, user: result.user }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('curio_token');
    setState(INITIAL_AUTH);
  }, []);

  const changeTab = useCallback((tab: AuthContextType['activeTab']) => {
    setState((p) => ({ ...p, activeTab: tab }));
  }, []);

  const setMenuOpen = useCallback((open: boolean) => setState((p) => ({ ...p, isMenuOpen: open })), []);
  const updateUser = useCallback((u: User) => setState((p) => ({ ...p, user: u })), []);
  const setUser = useCallback((u: User | null) => setState((p) => ({ ...p, user: u })), []);
  const setLoadingUserData = useCallback((v: boolean) => setState((p) => ({ ...p, isLoadingUserData: v })), []);

  return (
    <AuthContext.Provider value={{ ...state, login, loginWithOAuth, register, logout, changeTab, setMenuOpen, updateUser, setLoadingUserData, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('[Curios] useAuth() must be called inside <AuthProvider>.');
  return ctx;
}
