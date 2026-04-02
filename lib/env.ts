export const ENV = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY!,
} as const
