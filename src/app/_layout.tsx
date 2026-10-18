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
import { ServicesProvider } from '@/services';
import { subscribeToDatabaseChanges } from '@/services/dataVersion';
import { AppText } from '@/ui/components/AppText';
import { ThemeProvider, useTheme } from '@/ui/theme';
import { fontFamily } from '@/ui/tokens';

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

  useEffect(() => {
    if (database.ready) return subscribeToDatabaseChanges();
  }, [database.ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <BottomSheetModalProvider>
          {database.error ? (
            <DatabaseError />
          ) : (
            <ServicesProvider>
              <RootStack />
            </ServicesProvider>
          )}
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
      {/* Telas fora das abas têm cabeçalho com voltar; cada rota define o título. */}
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: fontFamily.semibold },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="lancamento/novo"
          options={{ presentation: 'modal', title: strings.screens.newTransaction.title }}
        />
        <Stack.Screen
          name="lancamento/[id]"
          options={{ title: strings.screens.editTransaction.title }}
        />
        <Stack.Screen name="dev/ui" options={{ title: strings.devCatalog.title }} />
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
