import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from '../src/screens/LoginScreen';
import { AuthProvider } from '../src/context/AuthContext';
import { api, ApiError } from '../src/api/client';

jest.mock('../src/api/client', () => {
  const actual = jest.requireActual('../src/api/client');
  return { ...actual, api: { ...actual.api, login: jest.fn() } };
});
const mockLogin = api.login as jest.MockedFunction<typeof api.login>;

function renderLogin() {
  return render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    </SafeAreaProvider>,
  );
}

describe('<LoginScreen />', () => {
  beforeEach(() => mockLogin.mockReset());

  it('shows validation errors and does not call the API for an empty form', () => {
    renderLogin();
    fireEvent.press(screen.getByTestId('login.submit'));
    expect(screen.getByTestId('login.email.error')).toHaveTextContent('Enter your email address');
    expect(screen.getByTestId('login.password.error')).toHaveTextContent('Enter your password');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('trims the email before sending it', async () => {
    mockLogin.mockResolvedValue({ token: 't', expiresAt: '', user: { id: 'u', name: 'Alice', email: 'alice@example.com' } });
    renderLogin();
    fireEvent.changeText(screen.getByTestId('login.email'), '  alice@example.com ');
    fireEvent.changeText(screen.getByTestId('login.password'), 'Password123!');
    fireEvent.press(screen.getByTestId('login.submit'));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('alice@example.com', 'Password123!'));
  });

  it('shows a friendly message and clears the password on 401', async () => {
    mockLogin.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect'));
    renderLogin();
    fireEvent.changeText(screen.getByTestId('login.email'), 'alice@example.com');
    fireEvent.changeText(screen.getByTestId('login.password'), 'wrong');
    fireEvent.press(screen.getByTestId('login.submit'));
    expect(await screen.findByTestId('login.error')).toHaveTextContent('Email or password is incorrect.');
    expect(screen.getByTestId('login.password').props.value).toBe('');
  });

  it('shows a connection message when the network fails', async () => {
    mockLogin.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Network request failed'));
    renderLogin();
    fireEvent.changeText(screen.getByTestId('login.email'), 'alice@example.com');
    fireEvent.changeText(screen.getByTestId('login.password'), 'x');
    fireEvent.press(screen.getByTestId('login.submit'));
    expect(await screen.findByTestId('login.error')).toHaveTextContent('Cannot reach the bank. Check your connection and try again.');
  });
});
