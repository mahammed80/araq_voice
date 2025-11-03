'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { RoomContext } from '@livekit/components-react';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { useRoom } from '@/hooks/useRoom';

const SessionContext = createContext<{
  appConfig: AppConfig;
  isSessionActive: boolean;
  startSession: () => void;
  endSession: () => void;
  updateRAGConfig: (ragConfig: AppConfig['ragConfig']) => void;
}>({
  appConfig: APP_CONFIG_DEFAULTS,
  isSessionActive: false,
  startSession: () => {},
  endSession: () => {},
  updateRAGConfig: () => {},
});

interface SessionProviderProps {
  appConfig: AppConfig;
  children: React.ReactNode;
}

export const SessionProvider = ({
  appConfig: initialAppConfig,
  children,
}: SessionProviderProps) => {
  const [ragConfig, setRAGConfig] = useState<AppConfig['ragConfig']>(initialAppConfig.ragConfig);

  const appConfig = useMemo(
    () => ({ ...initialAppConfig, ragConfig }),
    [initialAppConfig, ragConfig]
  );

  const { room, isSessionActive, startSession, endSession } = useRoom(appConfig);

  const updateRAGConfig = useCallback(
    (newRAGConfig: AppConfig['ragConfig']) => {
      setRAGConfig(newRAGConfig);
    },
    []
  );

  const contextValue = useMemo(
    () => ({ appConfig, isSessionActive, startSession, endSession, updateRAGConfig }),
    [appConfig, isSessionActive, startSession, endSession, updateRAGConfig]
  );

  return (
    <RoomContext.Provider value={room}>
      <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>
    </RoomContext.Provider>
  );
};

export function useSession() {
  return useContext(SessionContext);
}
