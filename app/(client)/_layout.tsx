import { Tabs } from 'expo-router'

export default function ClientLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#e11d48', tabBarStyle: { backgroundColor: '#1e293b' }, headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Programme' }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Nutrition' }} />
      <Tabs.Screen name="checkin" options={{ title: 'Check-in' }} />
    </Tabs>
  )
}
