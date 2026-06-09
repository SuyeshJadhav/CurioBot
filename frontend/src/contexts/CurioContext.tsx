/**
 * CurioContext.tsx — Composer and central re-export.
 *
 * The monolithic state has been split into focused domain contexts:
 *   AuthContext           → session, auth actions, activeTab, isMenuOpen
 *   UserPreferencesContext→ userSettings, interests
 *   PipelineContext       → article generation, history, active article
 *   LibraryContext        → sketches, collections, daily wonder
 *   ChatContext           → tutor chat messages, isTutorOpen
 *
 * Components that previously called useCurio() can now call the specific
 * hook for the domain they care about, preventing cross-domain re-renders.
 */
/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { UserPreferencesProvider } from './UserPreferencesContext';
import { PipelineProvider } from './PipelineContext';
import { LibraryProvider } from './LibraryContext';
import { ChatProvider } from './ChatContext';

// Re-export all domain hooks for convenience
export { useAuth } from './AuthContext';
export { usePreferences } from './UserPreferencesContext';
export { usePipeline } from './PipelineContext';
export { useLibrary } from './LibraryContext';
export { useChat } from './ChatContext';

/** Top-level provider tree — nest order matters (Auth wraps everything). */
export function CurioProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <UserPreferencesProvider>
        <PipelineProvider>
          <LibraryProvider>
            <ChatProvider>
              {children}
            </ChatProvider>
          </LibraryProvider>
        </PipelineProvider>
      </UserPreferencesProvider>
    </AuthProvider>
  );
}
