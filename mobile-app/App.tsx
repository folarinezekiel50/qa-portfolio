import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NavigationProvider, useNavigation } from './src/navigation/Navigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { AccountsScreen } from './src/screens/AccountsScreen';
import { AccountDetailScreen } from './src/screens/AccountDetailScreen';
import { TransferScreen } from './src/screens/TransferScreen';
import { TransferSuccessScreen } from './src/screens/TransferSuccessScreen';

function CurrentScreen() {
  const { route } = useNavigation();
  switch (route.name) {
    case 'Accounts': return <AccountsScreen />;
    case 'AccountDetail': return <AccountDetailScreen key={route.account.id} account={route.account} />;
    case 'Transfer': return <TransferScreen fromAccountId={route.fromAccountId} />;
    case 'TransferSuccess': return <TransferSuccessScreen transfer={route.transfer} payeeName={route.payeeName} />;
  }
}

function Root() {
  const { token } = useAuth();
  // Logged-out users only ever see the login screen. A fresh navigator on each login
  // means no screen from a previous session can leak into the next one.
  return token ? (
    <NavigationProvider>
      <CurrentScreen />
    </NavigationProvider>
  ) : (
    <LoginScreen />
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar barStyle="dark-content" />
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
