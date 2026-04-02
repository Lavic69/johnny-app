import OpenAI from 'openai'
import { ENV } from './env'
import type { ClientOnboarding, Exercise } from '@/types'

export const openai = new OpenAI({
  apiKey: ENV.openaiApiKey,
  dangerouslyAllowBrowser: true,
})

export interface ProgramDay {
  day: string
  order: number
  items: Exercise[]
}

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
- Réponds UNIQUEMENT avec un JSON valide, sans texte autour

FORMAT JSON ATTENDU :
[
  {
    "day": "Jour 1 — Poitrine & Triceps",
    "order": 1,
    "items": [
      {
        "name": "Développé couché",
        "sets": 4,
        "reps": "8-12",
        "rest_seconds": 90,
        "notes": "Descendre lentement, 3 secondes en excentrique"
      }
    ]
  }
]`
}

export async function generateProgram(
  onboarding: ClientOnboarding,
  coachNotes: string
): Promise<ProgramDay[]> {
  const prompt = buildProgramPrompt(onboarding, coachNotes)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('Réponse IA vide')

  const parsed = JSON.parse(content)
  const days: ProgramDay[] = Array.isArray(parsed) ? parsed : parsed.program ?? parsed.days ?? Object.values(parsed)[0]

  if (!Array.isArray(days)) throw new Error('Format IA invalide')
  return days
}
