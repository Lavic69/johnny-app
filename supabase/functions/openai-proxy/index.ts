import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Action = 'generate-program' | 'analyze-meal'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 1. Vérifier l'authentification Supabase
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseAnon = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!)
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Token invalide' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 2. Vérifier le rôle — seuls coach et client peuvent appeler OpenAI
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['coach', 'client'].includes(profile.role)) {
    return new Response(JSON.stringify({ error: 'Accès refusé' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 3. Parser le body
  const body = await req.json() as { action: Action; payload: unknown }
  const { action, payload } = body

  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'Configuration serveur manquante' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (action === 'generate-program') {
      const result = await generateProgram(payload as GenerateProgramPayload)
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'analyze-meal') {
      const result = await analyzeMeal(payload as AnalyzeMealPayload)
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Action inconnue' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface GenerateProgramPayload {
  onboarding: {
    goal: string
    level: string
    equipment: string
    frequency: number
    age: number
    weight_kg: number
    height_cm: number
    injuries?: string
  }
  coachNotes: string
}

interface AnalyzeMealPayload {
  text?: string
  imageBase64?: string
  mimeType?: string
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function generateProgram(payload: GenerateProgramPayload) {
  const { onboarding, coachNotes } = payload

  const goalLabels: Record<string, string> = {
    muscle_gain: 'prise de masse musculaire',
    weight_loss: 'perte de poids',
    performance: 'performance sportive',
    health: 'santé générale',
  }
  const levelLabels: Record<string, string> = {
    beginner: 'débutant',
    intermediate: 'intermédiaire',
    advanced: 'avancé',
  }
  const equipmentLabels: Record<string, string> = {
    full_gym: 'salle de sport complète',
    home_gym: 'home gym (haltères, barre)',
    none: 'aucun matériel (poids du corps uniquement)',
  }

  const prompt = `Tu es un coach sportif expert. Génère un programme d'entraînement hebdomadaire structuré pour ce client.

PROFIL CLIENT :
- Objectif : ${goalLabels[onboarding.goal] ?? onboarding.goal}
- Niveau : ${levelLabels[onboarding.level] ?? onboarding.level}
- Matériel : ${equipmentLabels[onboarding.equipment] ?? onboarding.equipment}
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

  const response = await callOpenAI({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  })

  const parsed = JSON.parse(response)
  const days = Array.isArray(parsed) ? parsed : parsed.program ?? parsed.days ?? Object.values(parsed)[0]
  if (!Array.isArray(days)) throw new Error('Format IA invalide')
  return days
}

async function analyzeMeal(payload: AnalyzeMealPayload) {
  const systemPrompt = `Tu es un nutritionniste expert. Estime les valeurs nutritionnelles TOTALES (pas pour 100g, mais pour la quantité décrite ou visible). Réponds UNIQUEMENT avec un JSON valide sans texte autour: {"name": "description courte", "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}`

  let messages: unknown[]

  if (payload.text) {
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Voici ce qu'un client a mangé : "${payload.text}"\n\nEstime les valeurs nutritionnelles totales de ce repas.` },
    ]
  } else if (payload.imageBase64 && payload.mimeType) {
    messages = [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${payload.mimeType};base64,${payload.imageBase64}` } },
        { type: 'text', text: `${systemPrompt}\n\nAnalyse ce plat et estime les valeurs nutritionnelles totales de ce qui est visible.` },
      ],
    }]
  } else {
    throw new Error('Payload invalide : text ou imageBase64 requis')
  }

  const response = await callOpenAI({
    model: 'gpt-4o-mini',
    messages,
    response_format: { type: 'json_object' },
  })

  const r = JSON.parse(response)
  return {
    name: String(r.name ?? 'Repas'),
    calories: Math.round(Number(r.calories) || 0),
    protein_g: Math.round((Number(r.protein_g) || 0) * 10) / 10,
    carbs_g: Math.round((Number(r.carbs_g) || 0) * 10) / 10,
    fat_g: Math.round((Number(r.fat_g) || 0) * 10) / 10,
  }
}

// ─── OpenAI fetch helper ──────────────────────────────────────────────────────

async function callOpenAI(body: unknown): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI erreur ${res.status}: ${err}`)
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  const content = data.choices[0]?.message?.content
  if (!content) throw new Error('Réponse IA vide')
  return content
}
