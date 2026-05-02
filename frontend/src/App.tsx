// App.tsx — Root entry point.
//
// The ONLY job of this file is to mount the CurioProvider
// and render AppShell inside it. All state lives in the
// provider; all layout lives in AppShell.

import { CurioProvider } from './contexts/CurioContext';
import { AppShell } from './components/layout/AppShell';

function App() {
  return (
    <CurioProvider>
      <AppShell />
    </CurioProvider>
  );
}

export default App;
