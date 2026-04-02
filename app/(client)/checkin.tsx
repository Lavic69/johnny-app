import { View, Text, StyleSheet } from 'react-native'

export default function CheckinScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Check-in — Phase 6</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  text: { color: '#94a3b8' },
})
