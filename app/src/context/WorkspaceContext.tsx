import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

export type Workspace =
  | { type: 'personal' }
  | { type: 'org'; id: string; name: string };

interface WorkspaceContextValue {
  workspace: Workspace;
  setWorkspace: (w: Workspace) => void;
}

const WORKSPACE_KEY = 'cubicecho_workspace';

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspace: { type: 'personal' },
  setWorkspace: () => {},
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspaceState] = useState<Workspace>({
    type: 'personal',
  });

  useEffect(() => {
    AsyncStorage.getItem(WORKSPACE_KEY).then((raw) => {
      if (!raw) return;
      try {
        setWorkspaceState(JSON.parse(raw) as Workspace);
      } catch {}
    });
  }, []);

  const setWorkspace = (w: Workspace) => {
    setWorkspaceState(w);
    AsyncStorage.setItem(WORKSPACE_KEY, JSON.stringify(w));
  };

  return (
    <WorkspaceContext.Provider value={{ workspace, setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
