/* eslint-disable react-refresh/only-export-components */
/**
 * BootstrapContext.tsx
 *
 * Fires a single GET /api/auth/bootstrap request when a token becomes
 * available, instead of having each child context fire its own individual
 * request.  The resolved data is stored here and consumed by
 * AuthContext (user), UserPreferencesContext, LibraryContext, and
 * PipelineContext to seed their initial state — zero individual startup fetches.
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { fetchBootstrap, type BootstrapData } from '../actions/authActions';
import { useAuth } from './AuthContext';

interface BootstrapContextType {
  bootstrap: BootstrapData | null;
  isBootstrapping: boolean;
  /** Re-run the full bootstrap (e.g. after account changes). */
  refresh: () => Promise<void>;
}

const BootstrapContext = createContext<BootstrapContextType | null>(null);

export function BootstrapProvider({ children }: { children: ReactNode }) {
  const { token, setLoadingUserData, setUser, logout } = useAuth();
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const runBootstrap = useCallback(async () => {
    setIsBootstrapping(true);
    setLoadingUserData(true);
    try {
      const data = await fetchBootstrap();
      setBootstrap(data);
      // Seed the user into AuthContext so the app shows the logged-in state
      setUser(data.user);
    } catch (err: any) {
      console.error('🔴 [Bootstrap] Failed to load session data:', err);
      // If the token is invalid (401), log the user out cleanly
      if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
        logout();
      }
    } finally {
      setIsBootstrapping(false);
      setLoadingUserData(false);
    }
  }, [setLoadingUserData, setUser, logout]);

  // Re-bootstrap whenever the auth token changes (login / logout / restore)
  useEffect(() => {
    if (!token) {
      setBootstrap(null);
      setUser(null);
      return;
    }
    runBootstrap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <BootstrapContext.Provider value={{ bootstrap, isBootstrapping, refresh: runBootstrap }}>
      {children}
    </BootstrapContext.Provider>
  );
}

export function useBootstrap(): BootstrapContextType {
  const ctx = useContext(BootstrapContext);
  if (!ctx)
    throw new Error(
      '[Curios] useBootstrap() must be called inside <BootstrapProvider>.',
    );
  return ctx;
}
