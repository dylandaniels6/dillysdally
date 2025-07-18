import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== ENVIRONMENT DEBUG ===');
    console.log('All env vars:', Object.keys(Deno.env.toObject()));
    console.log('OPENAI_API_KEY exists:', !!Deno.env.get('OPENAI_API_KEY'));
    console.log('OPENAI_API_KEY length:', Deno.env.get('OPENAI_API_KEY')?.length || 0);
    console.log('=========================');

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    return new Response(JSON.stringify({
      status: 'success',
      message: 'Test function works!',
      hasOpenAIKey: !!openaiApiKey,
      keyLength: openaiApiKey?.length || 0,
      allEnvKeys: Object.keys(Deno.env.toObject())
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Test error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      error: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});