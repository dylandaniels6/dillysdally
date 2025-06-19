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
    const { entry, habits, mood, date, context } = await req.json()

    // Create a comprehensive prompt for GPT-4
    const prompt = `As a therapeutic AI assistant, provide a thoughtful reflection on this journal entry. Focus on patterns, insights, and gentle guidance.

Journal Entry (${date}):
"${entry}"

Additional Context:
- Mood: ${mood}
- Day Rating: ${context?.dayRating}/5
- Wake Time: ${context?.wakeTime}
- Sleep Time: ${context?.sleepTime}
- Miles: ${context?.miles}
- Climbed: ${context?.climbed ? 'Yes' : 'No'}

Daily Habits:
${Object.entries(habits).map(([habit, completed]) => `- ${habit}: ${completed ? 'Completed' : 'Not completed'}`).join('\n')}

Please provide:
1. A brief reflection on the emotional tone and themes
2. Observations about patterns or habits
3. Gentle, supportive insights or suggestions
4. Encouragement for continued growth

Keep the response warm, supportive, and under 200 words.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a compassionate therapeutic AI assistant that provides thoughtful, supportive reflections on journal entries. Your responses should be warm, insightful, and encouraging while maintaining appropriate boundaries.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const reflection = data.choices[0]?.message?.content

    if (!reflection) {
      throw new Error('No reflection generated')
    }

    return new Response(
      JSON.stringify({ analysis: reflection }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})