# Phase 5 — Client : Tracker nutritionnel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le client peut logger ses repas via scan de code-barres ou recherche texte (Open Food Facts), voir ses macros du jour, et créer des repas sauvegardés.

**Architecture:** `lib/openfoodfacts.ts` wrapping l'API publique. Écran journal avec 4 repas. Scanner via expo-barcode-scanner. Résumé macros en haut de l'écran.

**Tech Stack:** Open Food Facts API (gratuite, pas de clé), expo-barcode-scanner, Supabase JS v2, TypeScript

---

## Task 1 : Wrapper Open Food Facts

**Files:**
- Create: `lib/openfoodfacts.ts`

- [ ] **Step 1 : Créer `lib/openfoodfacts.ts`**

```typescript
import type { FoodItem } from '@/types'

const BASE_URL = 'https://world.openfoodfacts.org'

export interface OFFProduct {
  product_name: string
  nutriments: {
    'energy-kcal_100g'?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
  }
  code: string
}

export async function searchByBarcode(barcode: string): Promise<FoodItem | null> {
  const res = await fetch(`${BASE_URL}/api/v0/product/${barcode}.json`)
  const json = await res.json()

  if (json.status !== 1 || !json.product) return null

  const p = json.product as OFFProduct
  return mapProduct(p, barcode)
}

export async function searchByText(query: string): Promise<FoodItem[]> {
  const encoded = encodeURIComponent(query)
  const res = await fetch(
    `${BASE_URL}/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,nutriments,code`
  )
  const json = await res.json()

  if (!json.products) return []

  return (json.products as OFFProduct[])
    .filter((p) => p.product_name && p.nutriments?.['energy-kcal_100g'] != null)
    .map((p) => mapProduct(p, p.code))
}

function mapProduct(p: OFFProduct, barcode: string): FoodItem {
  return {
    name: p.product_name || 'Produit inconnu',
    barcode,
    calories: Math.round(p.nutriments?.['energy-kcal_100g'] ?? 0),
    protein_g: Math.round((p.nutriments?.proteins_100g ?? 0) * 10) / 10,
    carbs_g: Math.round((p.nutriments?.carbohydrates_100g ?? 0) * 10) / 10,
    fat_g: Math.round((p.nutriments?.fat_100g ?? 0) * 10) / 10,
    quantity_g: 100,
  }
}
```

- [ ] **Step 2 : Commit**

```bash
git add lib/openfoodfacts.ts
git commit -m "feat: add Open Food Facts API wrapper"
```

---

## Task 2 : Écran journal nutritionnel

**Files:**
- Modify: `app/(client)/nutrition/index.tsx`

- [ ] **Step 1 : Réécrire `app/(client)/nutrition/index.tsx`**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useClientId } from '@/hooks/useClientId'
import type { FoodLog, FoodItem, MealType } from '@/types'

const MEALS: { key: MealType; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'Petit-déjeuner', emoji: '🌅' },
  { key: 'lunch', label: 'Déjeuner', emoji: '☀️' },
  { key: 'dinner', label: 'Dîner', emoji: '🌙' },
  { key: 'snack', label: 'Collation', emoji: '🍎' },
]

export default function NutritionScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const { clientId } = useClientId(profile?.id ?? null)
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  const fetchLogs = useCallback(async () => {
    if (!clientId) return
    const { data } = await supabase
      .from('food_logs')
      .select('*')
      .eq('client_id', clientId)
      .eq('logged_date', today)
    setLogs((data as FoodLog[]) ?? [])
    setLoading(false)
  }, [clientId, today])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Calculer les totaux du jour
  const allFoods = logs.flatMap((l) => l.foods)
  const totals = allFoods.reduce(
    (acc, f) => {
      const ratio = f.quantity_g / 100
      return {
        calories: acc.calories + f.calories * ratio,
        protein: acc.protein + f.protein_g * ratio,
        carbs: acc.carbs + f.carbs_g * ratio,
        fat: acc.fat + f.fat_g * ratio,
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  if (loading) return <View style={styles.center}><ActivityIndicator color="#e11d48" /></View>

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </View>

      {/* Résumé macros */}
      <View style={styles.macroCard}>
        <MacroStat label="Calories" value={Math.round(totals.calories)} unit="kcal" color="#e11d48" />
        <MacroStat label="Protéines" value={Math.round(totals.protein)} unit="g" color="#3080ff" />
        <MacroStat label="Glucides" value={Math.round(totals.carbs)} unit="g" color="#ff8b1a" />
        <MacroStat label="Lipides" value={Math.round(totals.fat)} unit="g" color="#00bb7f" />
      </View>

      {/* Repas */}
      {MEALS.map((meal) => {
        const mealLog = logs.find((l) => l.meal_type === meal.key)
        const mealFoods = mealLog?.foods ?? []
        return (
          <View key={meal.key} style={styles.mealSection}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealTitle}>{meal.emoji} {meal.label}</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => router.push({
                  pathname: '/(client)/nutrition/add',
                  params: { mealType: meal.key, clientId: clientId!, date: today },
                })}
              >
                <Text style={styles.addBtnText}>+ Ajouter</Text>
              </TouchableOpacity>
            </View>
            {mealFoods.length === 0 ? (
              <Text style={styles.emptyMeal}>Rien encore</Text>
            ) : (
              mealFoods.map((food, i) => (
                <FoodRow key={i} food={food} />
              ))
            )}
          </View>
        )
      })}
    </ScrollView>
  )
}

function MacroStat({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={macroStyles.stat}>
      <Text style={[macroStyles.value, { color }]}>{value}</Text>
      <Text style={macroStyles.unit}>{unit}</Text>
      <Text style={macroStyles.label}>{label}</Text>
    </View>
  )
}

function FoodRow({ food }: { food: FoodItem }) {
  const ratio = food.quantity_g / 100
  return (
    <View style={foodStyles.row}>
      <View style={foodStyles.info}>
        <Text style={foodStyles.name}>{food.name}</Text>
        <Text style={foodStyles.quantity}>{food.quantity_g}g</Text>
      </View>
      <Text style={foodStyles.calories}>{Math.round(food.calories * ratio)} kcal</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e293b' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc' },
  date: { color: '#94a3b8', fontSize: 14, marginTop: 2, textTransform: 'capitalize' },
  macroCard: { flexDirection: 'row', backgroundColor: '#334155', borderRadius: 20, margin: 16, padding: 20 },
  mealSection: { marginHorizontal: 16, marginBottom: 16 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mealTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 16 },
  addBtn: { backgroundColor: '#e11d4820', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  addBtnText: { color: '#e11d48', fontWeight: '600', fontSize: 13 },
  emptyMeal: { color: '#475569', fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
})

const macroStyles = StyleSheet.create({
  stat: { flex: 1, alignItems: 'center' },
  value: { fontSize: 20, fontWeight: 'bold' },
  unit: { color: '#64748b', fontSize: 11 },
  label: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
})

const foodStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#334155', borderRadius: 10, padding: 12, marginBottom: 6 },
  info: { flex: 1 },
  name: { color: '#f8fafc', fontSize: 14, fontWeight: '500' },
  quantity: { color: '#64748b', fontSize: 12, marginTop: 2 },
  calories: { color: '#94a3b8', fontSize: 13 },
})
```

- [ ] **Step 2 : Commit**

```bash
git add app/(client)/nutrition/index.tsx
git commit -m "feat: nutrition journal with daily macro summary"
```

---

## Task 3 : Écran ajout aliment (recherche + scanner)

**Files:**
- Create: `app/(client)/nutrition/add.tsx`
- Create: `app/(client)/nutrition/_layout.tsx`
- Create: `app/(client)/nutrition/scan.tsx`

- [ ] **Step 1 : Créer `app/(client)/nutrition/_layout.tsx`**

```typescript
import { Stack } from 'expo-router'

export default function NutritionLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 2 : Créer `app/(client)/nutrition/add.tsx`**

```typescript
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

    // Récupérer le log existant ou en créer un nouveau
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
```

- [ ] **Step 3 : Créer `app/(client)/nutrition/scan.tsx`**

```typescript
import { useState, useEffect } from 'react'
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
      Alert.alert('Produit introuvable', 'Ce code-barres n\'est pas dans la base de données.', [
        { text: 'Réessayer', onPress: () => setScanned(false) },
        { text: 'Retour', onPress: () => router.back() },
      ])
      setLoading(false)
      return
    }

    // Ajouter directement avec 100g par défaut
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
```

- [ ] **Step 4 : Commit**

```bash
git add app/(client)/nutrition/
git commit -m "feat: nutrition add screen with text search and barcode scanner"
```

---

## Résultat de la Phase 5

À la fin de cette phase :
- Journal nutritionnel avec 4 repas et résumé macros journalier
- Recherche texte Open Food Facts → sélection → saisie quantité → ajout
- Scanner code-barres → produit trouvé → ajouté en 100g
- Toutes les données visibles côté coach dans l'onglet Nutrition (Phase suivante)

**Prochaine phase :** Phase 6 — Check-ins hebdo + Notifications push
