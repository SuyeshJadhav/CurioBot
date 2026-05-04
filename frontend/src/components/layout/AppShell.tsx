// AppShell — Root layout component.
// Composes LeftSidebar, IgniteCanvas, and TutorSidebar
// into the three-column "journal" layout.
// State flows in via CurioContext — no props needed here.

import { LeftSidebar } from '../sidebar/LeftSidebar';
import { IgniteCanvas } from '../canvas/IgniteCanvas';
import { TutorSidebar } from '../chat/TutorSidebar';
import { MobileHeader } from './MobileHeader';

export function AppShell() {
  return (
    <>
      {/* Shown only on mobile via CSS media query */}
      <MobileHeader />

      <div className="app-shell">
        <LeftSidebar />
        <main className="main-content">
          <IgniteCanvas />
        </main>
        <TutorSidebar />
      </div>
    </>
  );
}
