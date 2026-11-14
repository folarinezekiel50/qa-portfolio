import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BackHandler } from 'react-native';
import type { Account, Transfer } from '../api/client';

/**
 * A deliberately tiny stack navigator built with React state and context.
 * It keeps the app free of native navigation dependencies, which makes the
 * Detox/Expo setup simpler and the flow easy to follow in a portfolio.
 */
export type Route =
  | { name: 'Accounts' }
  | { name: 'AccountDetail'; account: Account }
  | { name: 'Transfer'; fromAccountId?: string }
  | { name: 'TransferSuccess'; transfer: Transfer; payeeName: string };

interface Nav {
  route: Route;
  canGoBack: boolean;
  push: (route: Route) => void;
  goBack: () => void;
  reset: (route: Route) => void;
}

const NavContext = createContext<Nav | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: 'Accounts' }]);

  const push = useCallback((route: Route) => setStack((s) => [...s, route]), []);
  const goBack = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const reset = useCallback((route: Route) => setStack([route]), []);

  // Android hardware back button.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, goBack]);

  const value = useMemo(
    () => ({ route: stack[stack.length - 1], canGoBack: stack.length > 1, push, goBack, reset }),
    [stack, push, goBack, reset],
  );
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNavigation(): Nav {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNavigation must be used inside <NavigationProvider>');
  return ctx;
}
