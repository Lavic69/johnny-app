import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, ScrollView
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { searchByText } from '@/lib/openfoodfacts'
import { supabase } from '@/lib/supabase'
import type { FoodItem, MealType } from '@/types'

export default function AddFoodScreen() {
  const { mealType, clientId, date } = useLocalSearchParams<{
    mealType: MealType
    clientId: string
    date: string
  }>()
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [saving, setSaving] = useState(false)

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    setResults([])
    try {
      const found = await searchByText(query)
      setResults(found)
    } catch {
      Alert.alert('Erreur', 'Recherche impossible')
    } finally {
      setSearching(false)
    }
  }

  async function handleAdd() {
    if (!selectedFood) return
    setSaving(true)

    const foodWithQty: FoodItem = { ...selectedFood, quantity_g: parseFloat(quantity) || 100 }

    const { data: existing } = await supabase
      .from('food_logs')
      .select('id, foods')
      .eq('client_id', clientId)
      .eq('logged_date', date)
      .eq('meal_type', mealType)
      .maybeSingle()

    if (existing) {
      const updatedFoods = [...(existing.foods as FoodItem[]), foodWithQty]
      await supabase.from('food_logs').update({ foods: updatedFoods }).eq('id', existing.id)
    } else {
      await supabase.from('food_logs').insert({
        client_id: clientId,
        logged_date: date,
        meal_type: mealType,
        foods: [foodWithQty],
      })
    }

    setSaving(false)
    router.back()
  }

  const mealLabels: Record<MealType, string> = {
    breakfast: 'Petit-déjeuner',
    lunch: 'Déjeuner',
    dinner: 'Dîner',
    snack: 'Collation',
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{mealLabels[mealType] ?? 'Repas'}</Text>
        <TouchableOpacity
          onPress={() => router.push({
            pathname: '/(client)/nutrition/scan',
            params: { mealType, clientId, date },
          })}
        >
          <Text style={styles.scanBtn}>📷 Scanner</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un aliment..."
          placeholderTextColor="#64748b"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>OK</Text>
        </TouchableOpacity>
      </View>

      {searching && <ActivityIndicator color="#e11d48" style={{ marginTop: 20 }} />}

      {selectedFood ? (
        <ScrollView contentContainerStyle={styles.selectedContainer}>
          <View style={styles.selectedCard}>
            <Text style={styles.selectedName}>{selectedFood.name}</Text>
            <Text style={styles.selectedMacros}>
              Pour 100g : {selectedFood.calories} kcal · P {selectedFood.protein_g}g · G {selectedFood.carbs_g}g · L {selectedFood.fat_g}g
            </Text>
          </View>
          <Text style={styles.qtyLabel}>Quantité (grammes)</Text>
          <TextInput
            style={styles.qtyInput}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
          />
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
          <TouchableOpacity onPress={() => setSelectedFood(null)}>
            <Text style={styles.cancelText}>← Changer d'aliment</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultRow} onPress={() => setSelectedFood(item)}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultCal}>{item.calories} kcal/100g</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !searching && query
              ? <Text style={styles.noResults}>Aucun résultat. Essaie un autre terme.</Text>
              : null
          }
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e293b' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  backText: { color: '#e11d48', fontSize: 16 },
  title: { color: '#f8fafc', fontWeight: 'bold', fontSize: 17 },
  scanBtn: { color: '#3080ff', fontSize: 15 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, backgroundColor: '#334155', color: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 15 },
  searchBtn: { backgroundColor: '#e11d48', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: 'bold' },
  resultRow: { backgroundColor: '#334155', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultName: { color: '#f8fafc', fontSize: 14, flex: 1 },
  resultCal: { color: '#94a3b8', fontSize: 13 },
  noResults: { color: '#64748b', textAlign: 'center', marginTop: 40 },
  selectedContainer: { padding: 24 },
  selectedCard: { backgroundColor: '#334155', borderRadius: 16, padding: 16, marginBottom: 20 },
  selectedName: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16, marginBottom: 6 },
  selectedMacros: { color: '#94a3b8', fontSize: 13 },
  qtyLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  qtyInput: { backgroundColor: '#334155', color: '#f8fafc', borderRadius: 12, padding: 16, fontSize: 18, textAlign: 'center', marginBottom: 20 },
  addBtn: { backgroundColor: '#00bb7f', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnDisabled: { opacity: 0.5 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelText: { color: '#64748b', textAlign: 'center', fontSize: 14 },
})
