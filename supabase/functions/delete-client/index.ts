import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 1. Vérifier le JWT du coach
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseAnon = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!)
  const token = authHeader.replace('Bearer ', '')
  const { data: { user: coachUser }, error: authError } = await supabaseAnon.auth.getUser(token)

  if (authError || !coachUser) {
    return new Response(JSON.stringify({ error: 'Token invalide' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 2. Vérifier que l'appelant est bien un coach
  const { data: coachRecord } = await supabaseAdmin
    .from('coaches')
    .select('id')
    .eq('profile_id', coachUser.id)
    .single()

  if (!coachRecord) {
    return new Response(JSON.stringify({ error: 'Accès refusé : rôle coach requis' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 3. Récupérer le clientId depuis le body
  const { clientId } = await req.json() as { clientId: string }
  if (!clientId) {
    return new Response(JSON.stringify({ error: 'clientId manquant' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 4. Vérifier que ce client appartient bien à ce coach
  const { data: clientRecord } = await supabaseAdmin
    .from('clients')
    .select('profile_id')
    .eq('id', clientId)
    .eq('coach_id', coachRecord.id)
    .single()

  if (!clientRecord) {
    return new Response(JSON.stringify({ error: 'Client introuvable ou non autorisé' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 5. Supprimer l'utilisateur — le CASCADE DB supprime tout
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(clientRecord.profile_id)

  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
