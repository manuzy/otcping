import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const projectId = Deno.env.get('WALLETCONNECT_PROJECT_ID')
    
    console.log('WalletConnect Project ID from env:', projectId ? 'Found' : 'Not found')
    
    if (!projectId) {
      console.error('WALLETCONNECT_PROJECT_ID environment variable not set')
      return new Response(
        JSON.stringify({ 
          error: 'WalletConnect Project ID not configured. Please add WALLETCONNECT_PROJECT_ID to Supabase secrets.' 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Returning project ID:', projectId.slice(0, 8) + '...')
    return new Response(
      JSON.stringify({ projectId }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})