import { supabase } from '@/lib/supabase'

describe('supabase client', () => {
  it('is initialized', () => {
    expect(supabase).toBeDefined()
    expect(supabase.auth).toBeDefined()
  })
})
