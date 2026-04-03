import { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, TextInput, KeyboardAvoidingView, Platform
} from 'react-native'
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
  const [foundFood, setFoundFood] = useState<FoodItem | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [saving, setSaving] = useState(false)
  const processingRef = useRef(false)

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
    if (processingRef.current) return
    processingRef.current = true
    setScanned(true)
    setLoading(true)

    const food = await searchByBarcode(data)

    setLoading(false)

    if (!food) {
      Alert.alert("Produit introuvable", "Ce code-barres n'est pas dans la base de données.", [
        {
          text: 'Réessayer',
          onPress: () => {
            setScanned(false)
            processingRef.current = false
          },
        },
        { text: 'Retour', onPress: () => router.back() },
      ])
      return
    }

    setFoundFood(food)
    setQuantity('100')
  }

  async function handleAdd() {
    if (!foundFood) return
    setSaving(true)

    const qty = parseFloat(quantity) || 100
    const foodWithQty: FoodItem = { ...foundFood, quantity_g: qty }

    const { data: existing } = await supabase
      .from('food_logs')
      .select('id, foods')
      .eq('client_id', clientId)
      .eq('logged_date', date)
      .eq('meal_type', mealType)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('food_logs')
        .update({ foods: [...(existing.foods as FoodItem[]), foodWithQty] })
        .eq('id', existing.id)
    } else {
      await supabase.from('food_logs').insert({
        client_id: clientId,
        logged_date: date,
        meal_type: mealType,
        foods: [foodWithQty],
      })
    }

    setSaving(false)
    processingRef.current = false

    Alert.alert('Ajouté !', `${foundFood.name} (${qty}g) ajouté au journal.`, [
      {
        text: 'Scanner encore',
        onPress: () => {
          setFoundFood(null)
          setScanned(false)
        },
      },
      { text: 'Retour', onPress: () => router.back() },
    ])
  }

  // Étape 2 — confirmation quantité
  if (foundFood) {
    const ratio = (parseFloat(quantity) || 100) / 100
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.confirmContainer}>
          <Text style={styles.confirmTitle}>Produit trouvé ✓</Text>
          <View style={styles.foodCard}>
            <Text style={styles.foodName}>{foundFood.name}</Text>
            <Text style={styles.foodMacros}>
              Pour 100g : {foundFood.calories} kcal · P {foundFood.protein_g}g · G {foundFood.carbs_g}g · L {foundFood.fat_g}g
            </Text>
          </View>

          <Text style={styles.qtyLabel}>Quantité consommée (g)</Text>
          <TextInput
            style={styles.qtyInput}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />

          {parseFloat(quantity) > 0 && (
            <View style={styles.calcRow}>
              <Text style={styles.calcText}>
                → {Math.round(foundFood.calories * ratio)} kcal ·{' '}
                P {Math.round(foundFood.protein_g * ratio * 10) / 10}g ·{' '}
                G {Math.round(foundFood.carbs_g * ratio * 10) / 10}g ·{' '}
                L {Math.round(foundFood.fat_g * ratio * 10) / 10}g
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.addBtn, saving && styles.btnDisabled]}
            onPress={handleAdd}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.addBtnText}>Ajouter au journal</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setFoundFood(null); setScanned(false); processingRef.current = false }}
          >
            <Text style={styles.retryBtnText}>← Scanner un autre produit</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    )
  }

  // Étape 1 — caméra
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

  confirmContainer: { flex: 1, backgroundColor: '#1e293b', padding: 24, paddingTop: 64 },
  confirmTitle: { color: '#00bb7f', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  foodCard: { backgroundColor: '#334155', borderRadius: 16, padding: 16, marginBottom: 24 },
  foodName: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16, marginBottom: 6 },
  foodMacros: { color: '#94a3b8', fontSize: 13 },
  qtyLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  qtyInput: { backgroundColor: '#334155', color: '#f8fafc', borderRadius: 12, padding: 16, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  calcRow: { backgroundColor: '#0f172a', borderRadius: 10, padding: 12, marginBottom: 24 },
  calcText: { color: '#64748b', fontSize: 13, textAlign: 'center' },
  addBtn: { backgroundColor: '#00bb7f', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnDisabled: { opacity: 0.5 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  retryBtn: { padding: 12, alignItems: 'center' },
  retryBtnText: { color: '#64748b', fontSize: 14 },
})
