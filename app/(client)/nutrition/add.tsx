import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView,
  Platform, Image,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { analyzeMeal } from '@/lib/openai'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useAIConsent } from '@/hooks/useAIConsent'
import AIConsentModal from '@/components/AIConsentModal'
import type { FoodItem, MealType } from '@/types'

type Mode = 'text' | 'photo'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
}

export default function AddFoodScreen() {
  const { mealType, clientId, date } = useLocalSearchParams<{
    mealType: MealType
    clientId: string
    date: string
  }>()
  const router = useRouter()
  const { profile } = useAuth()
  const { consentState, accept, decline } = useAIConsent(profile?.id)

  const [mode, setMode] = useState<Mode>('text')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<{ uri: string; base64: string; mimeType: string } | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<FoodItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [consentModalVisible, setConsentModalVisible] = useState(false)
  const [pendingAnalysis, setPendingAnalysis] = useState<'text' | 'photo' | null>(null)

  async function runAnalyzeText() {
    if (!description.trim()) return
    setAnalyzing(true)
    try {
      const data = await analyzeMeal({ text: description })
      setResult({ ...data, quantity_g: 100, source: 'ai' })
    } catch {
      Alert.alert('Erreur', "Impossible d'analyser ce repas. Réessaie.")
    } finally {
      setAnalyzing(false)
    }
  }

  async function runAnalyzePhoto() {
    if (!image) return
    setAnalyzing(true)
    try {
      const data = await analyzeMeal({ imageBase64: image.base64, mimeType: image.mimeType })
      setResult({ ...data, quantity_g: 100, source: 'ai' })
    } catch {
      Alert.alert('Erreur', "Impossible d'analyser la photo. Réessaie.")
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleConsentAccept() {
    await accept()
    setConsentModalVisible(false)
    if (pendingAnalysis === 'text') await runAnalyzeText()
    else if (pendingAnalysis === 'photo') await runAnalyzePhoto()
    setPendingAnalysis(null)
  }

  function requestAnalysis(type: 'text' | 'photo') {
    if (consentState === 'pending') {
      setPendingAnalysis(type)
      setConsentModalVisible(true)
      return
    }
    if (type === 'text') runAnalyzeText()
    else runAnalyzePhoto()
  }

  async function handleAnalyzeText() {
    if (!description.trim()) return
    requestAnalysis('text')
  }

  async function handleTakePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission refusée', "Autorise l'accès à la caméra dans les paramètres.")
      return
    }
    const taken = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
    if (!taken.canceled && taken.assets[0]) {
      const a = taken.assets[0]
      setImage({ uri: a.uri, base64: a.base64!, mimeType: a.mimeType ?? 'image/jpeg' })
    }
  }

  async function handlePickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission refusée', "Autorise l'accès à la galerie dans les paramètres.")
      return
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      base64: true,
      quality: 0.5,
    })
    if (!picked.canceled && picked.assets[0]) {
      const a = picked.assets[0]
      setImage({ uri: a.uri, base64: a.base64!, mimeType: a.mimeType ?? 'image/jpeg' })
    }
  }

  async function handleAnalyzePhoto() {
    if (!image) return
    requestAnalysis('photo')
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)

    const { data: existing } = await supabase
      .from('food_logs')
      .select('id, foods')
      .eq('client_id', clientId)
      .eq('logged_date', date)
      .eq('meal_type', mealType)
      .maybeSingle()

    let error: any
    if (existing) {
      const res = await supabase
        .from('food_logs')
        .update({ foods: [...(existing.foods as FoodItem[]), result] })
        .eq('id', existing.id)
      error = res.error
    } else {
      const res = await supabase.from('food_logs').insert({
        client_id: clientId,
        logged_date: date,
        meal_type: mealType,
        foods: [result],
      })
      error = res.error
    }

    setSaving(false)
    if (error) {
      Alert.alert('Erreur', error.message)
      return
    }
    router.back()
  }

  // — Écran résultat IA
  if (result) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setResult(null)}>
            <Text style={styles.backText}>‹ Modifier</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Résultat</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <View style={styles.resultCard}>
            <Text style={styles.resultIcon}>🤖</Text>
            <Text style={styles.resultName}>{result.name}</Text>
            <Text style={styles.resultSub}>Estimation IA — valeurs totales du repas</Text>
            <View style={styles.macroRow}>
              <MacroBadge label="Calories" value={String(result.calories)} unit="kcal" color="#e11d48" />
              <MacroBadge label="Protéines" value={String(result.protein_g)} unit="g" color="#3080ff" />
              <MacroBadge label="Glucides" value={String(result.carbs_g)} unit="g" color="#ff8b1a" />
              <MacroBadge label="Lipides" value={String(result.fat_g)} unit="g" color="#00bb7f" />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.addBtnText}>Ajouter au journal</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.retryBtn} onPress={() => setResult(null)}>
            <Text style={styles.retryText}>Pas correct ? Réessayer</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  // — Écran saisie
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{MEAL_LABELS[mealType] ?? 'Repas'}</Text>
        <TouchableOpacity
          onPress={() => router.push({
            pathname: '/(client)/nutrition/scan',
            params: { mealType, clientId, date },
          })}
        >
          <Text style={styles.scanLink}>Scanner</Text>
        </TouchableOpacity>
      </View>

      {/* Mode tabs — hidden when AI consent declined */}
      {consentState !== 'declined' && (
        <View style={styles.tabs}>
          <ModeTab
            label="Décrire"
            icon="create-outline"
            active={mode === 'text'}
            onPress={() => setMode('text')}
          />
          <ModeTab
            label="Photo"
            icon="camera-outline"
            active={mode === 'photo'}
            onPress={() => setMode('photo')}
          />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {consentState === 'declined' && (
          <View style={styles.aiDisabledBox}>
            <Ionicons name="ban-outline" size={24} color="#475569" />
            <Text style={styles.aiDisabledTitle}>Analyse IA désactivée</Text>
            <Text style={styles.aiDisabledHint}>
              Tu as refusé le partage de données avec OpenAI. Utilise le scanner de code-barres ou gère tes préférences dans ton profil.
            </Text>
          </View>
        )}
        {consentState !== 'declined' && mode === 'text' && (
          <>
            <Text style={styles.modeTitle}>Décris ce que tu as mangé</Text>
            <Text style={styles.modeHint}>
              Inclus les quantités si tu les connais — l'IA sera plus précise.{'\n'}
              Ex: "2 œufs brouillés, 1 tranche de pain complet, café sans sucre"
            </Text>
            <TextInput
              style={styles.textarea}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: 500g de riz complet avec 200g de poulet grillé et une salade verte..."
              placeholderTextColor="#475569"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.analyzeBtn, (!description.trim() || analyzing) && styles.btnDisabled]}
              onPress={handleAnalyzeText}
              disabled={!description.trim() || analyzing}
            >
              {analyzing ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.analyzeBtnText}>Analyse en cours...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={styles.analyzeBtnText}>Analyser avec l'IA</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {consentState !== 'declined' && mode === 'photo' && (
          <>
            <Text style={styles.modeTitle}>Prends ton repas en photo</Text>
            <Text style={styles.modeHint}>
              L'IA analysera l'image pour estimer les valeurs nutritionnelles.
              Les estimations sur photo sont approximatives.
            </Text>

            {image ? (
              <>
                <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="cover" />
                <TouchableOpacity
                  style={[styles.analyzeBtn, analyzing && styles.btnDisabled]}
                  onPress={handleAnalyzePhoto}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.analyzeBtnText}>Analyse en cours...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color="#fff" />
                      <Text style={styles.analyzeBtnText}>Analyser la photo</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.retryBtn} onPress={() => setImage(null)}>
                  <Text style={styles.retryText}>Changer de photo</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
                  <Ionicons name="camera" size={32} color="#f8fafc" />
                  <Text style={styles.photoBtnText}>Prendre une photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
                  <Ionicons name="images" size={32} color="#f8fafc" />
                  <Text style={styles.photoBtnText}>Choisir dans la galerie</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
      <AIConsentModal
        visible={consentModalVisible}
        dataDescription="La description textuelle ou la photo de ton repas pour estimer les calories et macronutriments."
        onAccept={handleConsentAccept}
        onDecline={() => { decline(); setConsentModalVisible(false); setPendingAnalysis(null) }}
      />
    </KeyboardAvoidingView>
  )
}

function ModeTab({ label, icon, active, onPress }: {
  label: string; icon: string; active: boolean; onPress: () => void
}) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Ionicons name={icon as any} size={16} color={active ? '#e11d48' : '#64748b'} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function MacroBadge({ label, value, unit, color }: {
  label: string; value: string; unit: string; color: string
}) {
  return (
    <View style={styles.macroBadge}>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={styles.macroUnit}>{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  backText: { color: '#e11d48', fontSize: 16 },
  title: { color: '#f8fafc', fontWeight: 'bold', fontSize: 17 },
  scanLink: { color: '#3080ff', fontSize: 14, fontWeight: '600' },

  tabs: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 20,
    backgroundColor: '#1e293b', borderRadius: 14, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 11,
  },
  tabActive: { backgroundColor: '#0f172a' },
  tabText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#e11d48' },

  content: { paddingHorizontal: 20, paddingBottom: 40 },

  modeTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modeHint: { color: '#64748b', fontSize: 13, lineHeight: 19, marginBottom: 20 },

  textarea: {
    backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 16,
    padding: 16, fontSize: 15, lineHeight: 22, minHeight: 130,
    borderWidth: 1, borderColor: '#334155', marginBottom: 20,
  },

  analyzeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#e11d48', borderRadius: 14, padding: 16,
  },
  analyzeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  photoActions: { gap: 12, marginTop: 8 },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#1e293b', borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: '#334155',
  },
  photoBtnText: { color: '#f8fafc', fontSize: 16, fontWeight: '600' },

  preview: { width: '100%', height: 240, borderRadius: 16, marginBottom: 20 },

  btnDisabled: { opacity: 0.4 },

  retryBtn: { alignItems: 'center', paddingVertical: 14 },
  retryText: { color: '#64748b', fontSize: 14 },

  aiDisabledBox: {
    alignItems: 'center', gap: 10, padding: 32,
    backgroundColor: '#1e293b', borderRadius: 16,
    borderWidth: 1, borderColor: '#334155', marginTop: 8,
  },
  aiDisabledTitle: { color: '#64748b', fontSize: 16, fontWeight: '700' },
  aiDisabledHint: { color: '#475569', fontSize: 13, lineHeight: 19, textAlign: 'center' },

  // Résultat
  resultContainer: { padding: 24 },
  resultCard: {
    backgroundColor: '#1e293b', borderRadius: 20, padding: 24,
    marginBottom: 24, borderWidth: 1, borderColor: '#334155',
  },
  resultIcon: { fontSize: 32, marginBottom: 12 },
  resultName: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  resultSub: { color: '#475569', fontSize: 12, marginBottom: 20 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroBadge: { flex: 1, alignItems: 'center' },
  macroValue: { fontSize: 20, fontWeight: 'bold' },
  macroUnit: { color: '#64748b', fontSize: 11 },
  macroLabel: { color: '#94a3b8', fontSize: 11, marginTop: 2 },

  addBtn: {
    backgroundColor: '#00bb7f', borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 12,
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
