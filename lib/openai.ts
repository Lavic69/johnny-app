import { supabase } from './supabase'
import type { ClientOnboarding, Exercise } from '@/types'

export interface ProgramDay {
  day: string
  order: number
  items: Exercise[]
}

// ─── Edge Function proxy ──────────────────────────────────────────────────────
// La clé OpenAI est un secret serveur dans Supabase — jamais exposée dans le bundle.

async function callProxy<T>(action: string, payload: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke('openai-proxy', {
    body: { action, payload },
  })

  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data as T
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateProgram(
  onboarding: ClientOnboarding,
  coachNotes: string
): Promise<ProgramDay[]> {
  return callProxy<ProgramDay[]>('generate-program', { onboarding, coachNotes })
}

export async function analyzeMeal(
  input: { text: string } | { imageBase64: string; mimeType: string }
): Promise<{ name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }> {
  return callProxy('analyze-meal', input)
}

// ─── Conservé pour compatibilité (utilisé dans generate.tsx) ─────────────────

export function buildProgramPrompt(onboarding: ClientOnboarding, coachNotes: string): string {
  const goalLabels: Record<ClientOnboarding['goal'], string> = {
    muscle_gain: 'prise de masse musculaire',
    weight_loss: 'perte de poids',
    performance: 'performance sportive',
    health: 'santé générale',
  }
  const levelLabels: Record<ClientOnboarding['level'], string> = {
    beginner: 'débutant',
    intermediate: 'intermédiaire',
    advanced: 'avancé',
  }
  const equipmentLabels: Record<ClientOnboarding['equipment'], string> = {
    full_gym: 'salle de sport complète',
    home_gym: 'home gym (haltères, barre)',
    none: 'aucun matériel (poids du corps uniquement)',
  }

  return `Tu es un coach sportif expert. Génère un programme d'entraînement hebdomadaire structuré pour ce client.

PROFIL CLIENT :
- Objectif : ${goalLabels[onboarding.goal]}
- Niveau : ${levelLabels[onboarding.level]}
- Matériel : ${equipmentLabels[onboarding.equipment]}
- Fréquence souhaitée : ${onboarding.frequency} jours/semaine
- Âge : ${onboarding.age} ans, Poids : ${onboarding.weight_kg}kg, Taille : ${onboarding.height_cm}cm
- Blessures/contre-indications : ${onboarding.injuries || 'aucune'}

NOTES DU COACH :
${coachNotes || 'Aucune note spécifique.'}

INSTRUCTIONS :
- Génère exactement ${onboarding.frequency} jours d'entraînement
- Pour chaque jour, fournis 4 à 6 exercices
- Les séries doivent être adaptées au niveau du client
- Réponds UNIQUEMENT avec un JSON valide, sans texte autour`
}
