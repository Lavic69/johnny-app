import { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useFocusEffect } from 'expo-router'
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

  useFocusEffect(useCallback(() => { fetchLogs() }, [fetchLogs]))

  async function handleDelete(logId: string, foodIndex: number) {
    const log = logs.find((l) => l.id === logId)
    if (!log) return

    Alert.alert('Supprimer ?', 'Retirer cet aliment du journal ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const updatedFoods = log.foods.filter((_, i) => i !== foodIndex)

          if (updatedFoods.length === 0) {
            await supabase.from('food_logs').delete().eq('id', logId)
          } else {
            await supabase.from('food_logs').update({ foods: updatedFoods }).eq('id', logId)
          }

          setLogs((prev) =>
            prev
              .map((l) => l.id === logId ? { ...l, foods: updatedFoods } : l)
              .filter((l) => l.foods.length > 0)
          )
        },
      },
    ])
  }

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

      <View style={styles.macroCard}>
        <MacroStat label="Calories" value={Math.round(totals.calories)} unit="kcal" color="#e11d48" />
        <MacroStat label="Protéines" value={Math.round(totals.protein)} unit="g" color="#3080ff" />
        <MacroStat label="Glucides" value={Math.round(totals.carbs)} unit="g" color="#ff8b1a" />
        <MacroStat label="Lipides" value={Math.round(totals.fat)} unit="g" color="#00bb7f" />
      </View>

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
                <FoodRow
                  key={i}
                  food={food}
                  onDelete={mealLog ? () => handleDelete(mealLog.id, i) : undefined}
                />
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

function FoodRow({ food, onDelete }: { food: FoodItem; onDelete?: () => void }) {
  const ratio = food.quantity_g / 100
  return (
    <View style={foodStyles.row}>
      <View style={foodStyles.info}>
        <Text style={foodStyles.name}>{food.name}</Text>
        {food.source !== 'ai' && (
          <Text style={foodStyles.quantity}>{food.quantity_g}g</Text>
        )}
      </View>
      <Text style={foodStyles.calories}>{Math.round(food.calories * ratio)} kcal</Text>
      {onDelete && (
        <TouchableOpacity style={foodStyles.deleteBtn} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={foodStyles.deleteText}>✕</Text>
        </TouchableOpacity>
      )}
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
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', borderRadius: 10, padding: 12, marginBottom: 6, gap: 8 },
  info: { flex: 1 },
  name: { color: '#f8fafc', fontSize: 14, fontWeight: '500' },
  quantity: { color: '#64748b', fontSize: 12, marginTop: 2 },
  calories: { color: '#94a3b8', fontSize: 13 },
  deleteBtn: { padding: 4 },
  deleteText: { color: '#475569', fontSize: 16, fontWeight: 'bold' },
})
