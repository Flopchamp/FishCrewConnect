import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { useSocketIO } from '../services/socketService';
import ErrorBoundary from '../components/ErrorBoundary';

function SocketManager() {
  const { isConnected, error, connect } = useSocketIO();
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 3;

  useEffect(() => {
    let reconnectTimer;
    
    if (error && reconnectAttempts < maxReconnectAttempts) {
      const delay = (reconnectAttempts + 1) * 3000;
      console.log(`Socket error detected, will try reconnecting in ${delay/1000}s...`);
      
      reconnectTimer = setTimeout(() => {
        console.log(`Reconnect attempt ${reconnectAttempts + 1}`);
        try {
          connect();
          setReconnectAttempts(prev => prev + 1);
        } catch (err) {
          console.error('Socket reconnection failed:', err.message || err);
        }
      }, delay);
    } else if (error) {
      console.log('Max reconnection attempts reached. Socket connection failed.');
    }
    
    if (isConnected) {
      console.log('Socket connection established in layout');
      setReconnectAttempts(0);
    }

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [isConnected, error, connect, reconnectAttempts]);

  return null;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <SocketManager />
          <Stack
            screenOptions={{
              headerShown: false,
              headerTitleStyle: { 
                fontFamily: 'System',
                fontSize: 18,
                fontWeight: 'bold' 
              }
            }}
          />
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
