import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { searchByBarcode } from '@/lib/openfoodfacts'
import { supabase } from '@/lib/supabase'
import type { FoodItem, MealType } from '@/types'

export default function ScanScreen() {
  const { mealType, clientId, date } = useLocalSearchParams<{
    mealType: MealType
    clientId: string
    date: string
  }>()
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!permission) return <View style={styles.container} />

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>L'accès à la caméra est nécessaire pour scanner.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Autoriser</Text>
        </TouchableOpacity>
      </View>
    )
  }

  async function handleBarcode({ data }: { data: string }) {
    if (scanned || loading) return
    setScanned(true)
    setLoading(true)

    const food = await searchByBarcode(data)

    if (!food) {
      Alert.alert("Produit introuvable", "Ce code-barres n'est pas dans la base de données.", [
        { text: 'Réessayer', onPress: () => setScanned(false) },
        { text: 'Retour', onPress: () => router.back() },
      ])
      setLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from('food_logs')
      .select('id, foods')
      .eq('client_id', clientId)
      .eq('logged_date', date)
      .eq('meal_type', mealType)
      .maybeSingle()

    if (existing) {
      await supabase.from('food_logs').update({ foods: [...(existing.foods as FoodItem[]), food] }).eq('id', existing.id)
    } else {
      await supabase.from('food_logs').insert({ client_id: clientId, logged_date: date, meal_type: mealType, foods: [food] })
    }

    setLoading(false)
    Alert.alert('Ajouté !', `${food.name} ajouté au journal (100g).`, [
      { text: 'Scanner encore', onPress: () => setScanned(false) },
      { text: 'Retour', onPress: () => router.back() },
    ])
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcode}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.loadingText}>Recherche du produit...</Text>
        </View>
      )}
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>Pointez la caméra vers le code-barres</Text>
      </View>
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.closeBtnText}>✕ Fermer</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b', padding: 40 },
  permText: { color: '#f8fafc', textAlign: 'center', marginBottom: 20, fontSize: 16 },
  permBtn: { backgroundColor: '#e11d48', borderRadius: 12, padding: 14, paddingHorizontal: 24 },
  permBtnText: { color: '#fff', fontWeight: 'bold' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  frame: { width: 260, height: 160, borderWidth: 2, borderColor: '#e11d48', borderRadius: 12 },
  hint: { color: '#fff', marginTop: 20, fontSize: 14, textAlign: 'center' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000a', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 12 },
  closeBtn: { position: 'absolute', top: 60, right: 20, backgroundColor: '#0008', borderRadius: 20, padding: 10 },
  closeBtnText: { color: '#fff', fontWeight: '600' },
})
