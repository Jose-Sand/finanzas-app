import { router, Tabs } from 'expo-router';
import { View } from 'react-native';
import { ArrowLeftRight, Ellipsis, LayoutGrid, PieChart, Plus } from 'lucide-react-native';
import { fonts, useTheme } from '@/lib/theme';

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.ink,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 20 },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.faint,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Resumen', tabBarIcon: ({ color }) => <LayoutGrid color={color} size={22} /> }} />
      <Tabs.Screen name="movimientos" options={{ title: 'Movimientos', tabBarIcon: ({ color }) => <ArrowLeftRight color={color} size={22} /> }} />
      <Tabs.Screen
        name="nuevo"
        options={{
          title: '',
          tabBarAccessibilityLabel: 'Registrar movimiento',
          tabBarIcon: () => (
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.mango, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
              <Plus color={c.mangoInk} size={26} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/movimiento');
          },
        }}
      />
      <Tabs.Screen name="presupuestos" options={{ title: 'Presupuestos', tabBarIcon: ({ color }) => <PieChart color={color} size={22} /> }} />
      <Tabs.Screen name="mas" options={{ title: 'Más', tabBarIcon: ({ color }) => <Ellipsis color={color} size={22} /> }} />
    </Tabs>
  );
}
