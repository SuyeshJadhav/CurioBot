/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { UserSettings } from '../types/curio';
import {
  fetchSettings,
  updateSettings,
  fetchInterests,
  addInterest as apiAddInterest,
  deleteInterest as apiDeleteInterest,
} from '../actions/settingsActions';
import { useBootstrap } from './BootstrapContext';

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
  const { bootstrap } = useBootstrap();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  // Seed from bootstrap data — avoids individual fetch-on-mount
  useEffect(() => {
    if (!bootstrap) return;
    setUserSettings(bootstrap.settings ?? null);
    setInterests(bootstrap.interests ?? []);
  }, [bootstrap]);

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

  const addInterest = useCallback(
    async (interest: string) => {
      const prev = interests;
      setInterests((i) => (i.includes(interest) ? i : [...i, interest]));
      try {
        await apiAddInterest(interest);
        await loadInterests();
      } catch {
        setInterests(prev);
      }
    },
    [interests, loadInterests],
  );

  const deleteInterest = useCallback(
    async (interest: string) => {
      const prev = interests;
      setInterests((i) => i.filter((x) => x !== interest));
      try {
        await apiDeleteInterest(interest);
        await loadInterests();
      } catch {
        setInterests(prev);
      }
    },
    [interests, loadInterests],
  );

  return (
    <UserPreferencesContext.Provider
      value={{
        userSettings,
        interests,
        loadSettings,
        saveSettings,
        loadInterests,
        addInterest,
        deleteInterest,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function usePreferences(): UserPreferencesContextType {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx)
    throw new Error(
      '[Curios] usePreferences() must be called inside <UserPreferencesProvider>.',
    );
  return ctx;
}
