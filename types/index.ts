export type Role = 'coach' | 'client' | 'admin'
export type CoachStatus = 'active' | 'pending'
export type ProgramStatus = 'draft' | 'approved'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Profile {
  id: string
  role: Role
  full_name: string
  avatar_url: string | null
  created_at: string
}

export interface Coach {
  id: string
  profile_id: string
  status: CoachStatus
  created_at: string
}

export interface ClientOnboarding {
  goal: 'muscle_gain' | 'weight_loss' | 'performance' | 'health'
  level: 'beginner' | 'intermediate' | 'advanced'
  injuries: string
  equipment: 'full_gym' | 'home_gym' | 'none'
  frequency: number
  weight_kg: number
  height_cm: number
  age: number
}

export interface NutritionGoal {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface Client {
  id: string
  profile_id: string
  coach_id: string
  onboarding: ClientOnboarding | null
  nutrition_goal: NutritionGoal | null
  created_at: string
}

export interface Exercise {
  name: string
  sets: number
  reps: string
  rest_seconds: number
  notes?: string
}

export interface Program {
  id: string
  client_id: string
  coach_id: string
  status: ProgramStatus
  exercises: { day: string; order: number; items: Exercise[] }[]
  coach_notes: string | null
  created_at: string
  approved_at: string | null
}

export interface SetLog {
  exercise: string
  weight: number
  reps: number
  rpe: number
}

export interface SessionLog {
  id: string
  session_id: string
  client_id: string
  sets: SetLog[]
  completed: boolean
  logged_at: string
}

export interface PersonalRecord {
  id: string
  client_id: string
  exercise_name: string
  weight: number
  reps: number
  achieved_at: string
}

export interface FoodItem {
  name: string
  barcode?: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  quantity_g: number
}

export interface FoodLog {
  id: string
  client_id: string
  logged_date: string
  meal_type: MealType
  foods: FoodItem[]
  created_at: string
}

export interface WeeklyCheckin {
  id: string
  client_id: string
  week_start: string
  energy: number
  recovery: number
  mood: number
  created_at: string
}
