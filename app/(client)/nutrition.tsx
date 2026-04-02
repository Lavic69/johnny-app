import { View, Text, StyleSheet } from 'react-native'

export default function NutritionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Nutrition — Phase 5</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  text: { color: '#94a3b8' },
})
