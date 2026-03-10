/**
 * Mac Septic CRM - Field Service Mobile App
 * React Native / Expo application for field technicians
 */
import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { LoginScreen } from './src/screens/LoginScreen';
import { WorkOrdersScreen } from './src/screens/WorkOrdersScreen';
import { WorkOrderDetailScreen } from './src/screens/WorkOrderDetailScreen';
import { CompletionScreen } from './src/screens/CompletionScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { hasAuthToken, clearAuthToken, authEventEmitter } from './src/api/client';
import { offlineQueue } from './src/api/offlineQueue';
import { colors } from './src/utils/theme';
import { WorkOrder } from './src/api/types';

// Create React Query client with mobile-optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

type AppScreen = 'loading' | 'login' | 'workOrders' | 'workOrderDetail' | 'completion' | 'settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('loading');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);

  // Initialize app
  useEffect(() => {
    const init = async () => {
      // Initialize offline queue
      await offlineQueue.init();

      // Check auth status
      const isAuthenticated = await hasAuthToken();
      setCurrentScreen(isAuthenticated ? 'workOrders' : 'login');
    };

    init();

    // Listen for auth expiration
    const unsubscribe = authEventEmitter.on('expired', () => {
      queryClient.clear();
      setCurrentScreen('login');
    });

    return unsubscribe;
  }, []);

  // Handle login success
  const handleLoginSuccess = useCallback(() => {
    setCurrentScreen('workOrders');
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
    await clearAuthToken();
    queryClient.clear();
    setCurrentScreen('login');
  }, []);

  // Handle work order selection
  const handleWorkOrderPress = useCallback((workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setCurrentScreen('workOrderDetail');
  }, []);

  // Handle back to work orders list
  const handleBackToList = useCallback(() => {
    setSelectedWorkOrder(null);
    setCurrentScreen('workOrders');
  }, []);

  // Handle start completion flow
  const handleStartCompletion = useCallback((workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setCurrentScreen('completion');
  }, []);

  // Handle completion finished
  const handleCompletionDone = useCallback(() => {
    setSelectedWorkOrder(null);
    setCurrentScreen('workOrders');
  }, []);

  // Handle settings navigation
  const handleSettingsPress = useCallback(() => {
    setCurrentScreen('settings');
  }, []);

  // Handle back from settings
  const handleSettingsBack = useCallback(() => {
    setCurrentScreen('workOrders');
  }, []);

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'loading':
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        );

      case 'login':
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;

      case 'workOrders':
        return (
          <WorkOrdersScreen
            onWorkOrderPress={handleWorkOrderPress}
            onSettingsPress={handleSettingsPress}
          />
        );

      case 'workOrderDetail':
        return selectedWorkOrder ? (
          <WorkOrderDetailScreen
            workOrder={selectedWorkOrder}
            onBack={handleBackToList}
            onStartCompletion={handleStartCompletion}
          />
        ) : null;

      case 'completion':
        return selectedWorkOrder ? (
          <CompletionScreen
            workOrder={selectedWorkOrder}
            onBack={() => {
              setCurrentScreen('workOrderDetail');
            }}
            onComplete={handleCompletionDone}
          />
        ) : null;

      case 'settings':
        return (
          <SettingsScreen
            onBack={handleSettingsBack}
            onLogout={handleLogout}
          />
        );

      default:
        return null;
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          {renderScreen()}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
