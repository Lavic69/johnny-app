import { Tabs } from 'expo-router'

export default function CoachLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#e11d48', tabBarStyle: { backgroundColor: '#1e293b' }, headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients' }} />
    </Tabs>
  )
}
