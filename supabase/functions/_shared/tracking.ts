import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { OpenAIClient } from './openai.ts';

interface UsageRecord {
  user_id: string;
  function_name: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_estimate: number;
  duration_ms: number;
  status: 'success' | 'error';
  error_message?: string;
}

export class UsageTracker {
  constructor(private supabase: SupabaseClient) {}

  async trackUsage(
    record: UsageRecord
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_usage')
        .insert(record);

      if (error) {
        console.error('Failed to track usage:', error);
      }
    } catch (error) {
      console.error('Usage tracking error:', error);
      // Don't throw - tracking failures shouldn't break the function
    }
  }

  async getUserUsageStats(
    userId: string,
    days = 30
  ): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('ai_usage')
      .select('function_name, model, sum(total_tokens), sum(cost_estimate), count(*)')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .group('function_name, model');

    if (error) {
      console.error('Failed to get usage stats:', error);
      return null;
    }

    return data;
  }
}

export const trackFunctionCall = async (
  supabase: SupabaseClient,
  functionName: string,
  userId: string,
  model: string,
  startTime: number,
  usage: any,
  status: 'success' | 'error' = 'success',
  errorMessage?: string
): Promise<void> => {
  const tracker = new UsageTracker(supabase);
  
  const cost = OpenAIClient.calculateCost(model, usage);
  const duration = Date.now() - startTime;

  await tracker.trackUsage({
    user_id: userId,
    function_name: functionName,
    model,
    input_tokens: usage.prompt_tokens || 0,
    output_tokens: usage.completion_tokens || 0,
    total_tokens: usage.total_tokens || 0,
    cost_estimate: cost,
    duration_ms: duration,
    status,
    error_message: errorMessage,
  });
};