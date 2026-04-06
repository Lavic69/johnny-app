import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { useCoach } from '@/hooks/useCoach'
import { supabase } from '@/lib/supabase'

export default function CoachLayout() {
  const { profile } = useAuth()
  const { coach, loading } = useCoach(profile?.id ?? null)

  // Compte désactivé ou en attente → écran bloquant
  if (!loading && coach && coach.status !== 'active') {
    return (
      <View style={styles.blocked}>
        <View style={styles.iconWrap}>
          <Ionicons name="time-outline" size={40} color="#ff8b1a" />
        </View>
        <Text style={styles.title}>Compte en attente</Text>
        <Text style={styles.subtitle}>
          Ton compte coach n'est pas encore activé.{'\n'}
          Contacte Johnny pour finaliser l'activation.
        </Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#e11d48',
        tabBarInactiveTintColor: '#475569',
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          unmountOnBlur: true,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Compte',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
      {/* Caché de la tab bar — accessible via navigation depuis la fiche client */}
      <Tabs.Screen name="programs" options={{ href: null }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1, backgroundColor: '#0f172a',
    justifyContent: 'center', alignItems: 'center',
    padding: 40, gap: 16,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#ff8b1a15', borderWidth: 1, borderColor: '#ff8b1a30',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#64748b', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  logoutBtn: {
    marginTop: 16, backgroundColor: '#1e293b', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  logoutText: { color: '#e11d48', fontWeight: '600', fontSize: 15 },
})
