import '../global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useDatabaseSetup } from '@/db/setup';
import { strings } from '@/lib/strings';
import { AppText } from '@/ui/components/AppText';
import { ThemeProvider, useTheme } from '@/ui/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const database = useDatabaseSetup();
  const ready = (fontsLoaded || fontError !== null) && (database.ready || database.error !== null);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <BottomSheetModalProvider>
          {database.error ? <DatabaseError /> : <RootStack />}
        </BottomSheetModalProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="lancamento/novo"
          options={{ presentation: 'modal', title: strings.screens.newTransaction.title }}
        />
        <Stack.Screen
          name="lancamento/[id]"
          options={{ headerShown: true, title: strings.screens.editTransaction.title }}
        />
        <Stack.Screen
          name="dev/ui"
          options={{ headerShown: true, title: strings.devCatalog.title }}
        />
      </Stack>
    </>
  );
}

function DatabaseError() {
  return (
    <View className="flex-1 items-center justify-center bg-bg p-6">
      <AppText variant="title" tone="expense" className="text-center">
        {strings.errors.database}
      </AppText>
    </View>
  );
}
