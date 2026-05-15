import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { HomeScreen } from '../screens/HomeScreen';
import { InvoicesScreen } from '../screens/InvoicesScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { NewSaleScreen } from '../screens/NewSaleScreen';
import { ProductsScreen } from '../screens/ProductsScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { useAuthStore } from '../store/auth';
import { colors } from '../theme/index';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('appName') }} />
      <Tab.Screen
        name="Invoices"
        component={InvoicesScreen}
        options={{ title: t('home.invoices') }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{ title: t('home.products') }}
      />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ title: t('home.reports') }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const ready = useAuthStore((s) => s.ready);
  const authed = useAuthStore((s) => Boolean(s.accessToken));
  if (!ready) return null;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
      }}
    >
      {!authed ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="NewSale" component={NewSaleScreen} options={{ title: '' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
