/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { UserSettings } from '../types/curio';
import { fetchSettings, updateSettings, fetchInterests, addInterest as apiAddInterest, deleteInterest as apiDeleteInterest } from '../actions/settingsActions';
import { useAuth } from './AuthContext';

export interface UserPreferencesContextType {
  userSettings: UserSettings | null;
  interests: string[];
  loadSettings: () => Promise<void>;
  saveSettings: (s: UserSettings) => Promise<void>;
  loadInterests: () => Promise<void>;
  addInterest: (interest: string) => Promise<void>;
  deleteInterest: (interest: string) => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { token, setLoadingUserData } = useAuth();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  const loadSettings = useCallback(async () => {
    const s = await fetchSettings();
    setUserSettings(s);
  }, []);

  const saveSettings = useCallback(async (s: UserSettings) => {
    await updateSettings(s);
    setUserSettings(s);
  }, []);

  const loadInterests = useCallback(async () => {
    const list = await fetchInterests();
    setInterests(list);
  }, []);

  const addInterest = useCallback(async (interest: string) => {
    const prev = interests;
    setInterests((i) => (i.includes(interest) ? i : [...i, interest]));
    try { await apiAddInterest(interest); await loadInterests(); }
    catch { setInterests(prev); }
  }, [interests, loadInterests]);

  const deleteInterest = useCallback(async (interest: string) => {
    const prev = interests;
    setInterests((i) => i.filter((x) => x !== interest));
    try { await apiDeleteInterest(interest); await loadInterests(); }
    catch { setInterests(prev); }
  }, [interests, loadInterests]);

  // Load user data whenever auth token appears
  useEffect(() => {
    if (!token) return;
    setLoadingUserData(true);
    Promise.all([loadSettings(), loadInterests()])
      .catch(console.error)
      .finally(() => setLoadingUserData(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <UserPreferencesContext.Provider value={{ userSettings, interests, loadSettings, saveSettings, loadInterests, addInterest, deleteInterest }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function usePreferences(): UserPreferencesContextType {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error('[Curios] usePreferences() must be called inside <UserPreferencesProvider>.');
  return ctx;
}
