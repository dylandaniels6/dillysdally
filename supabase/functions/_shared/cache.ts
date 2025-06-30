import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { generateCacheKey } from './openai.ts';

export class ResponseCache {
  constructor(
    private supabase: SupabaseClient,
    private defaultTTL: number = 3600 // 1 hour default
  ) {}

  async get(
    functionName: string,
    params: any,
    userId?: string
  ): Promise<any | null> {
    try {
      const cacheKey = await generateCacheKey(functionName, params, userId);
      
      const { data, error } = await this.supabase
        .from('ai_response_cache')
        .select('response, expires_at')
        .eq('cache_key', cacheKey)
        .single();

      if (error || !data) {
        return null;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        // Delete expired entry
        await this.supabase
          .from('ai_response_cache')
          .delete()
          .eq('cache_key', cacheKey);
        return null;
      }

      console.log(`Cache hit for ${functionName}`);
      return data.response;
      
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(
    functionName: string,
    params: any,
    response: any,
    ttlSeconds?: number,
    userId?: string,
    tokensUsed?: number
  ): Promise<void> {
    try {
      const cacheKey = await generateCacheKey(functionName, params, userId);
      const requestHash = await generateCacheKey('hash', params);
      const ttl = ttlSeconds || this.defaultTTL;
      const expiresAt = new Date(Date.now() + ttl * 1000);

      const { error } = await this.supabase
        .from('ai_response_cache')
        .upsert({
          cache_key: cacheKey,
          function_name: functionName,
          request_hash: requestHash,
          response,
          tokens_used: tokensUsed || 0,
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        console.error('Cache set error:', error);
      } else {
        console.log(`Cached response for ${functionName}, expires at ${expiresAt}`);
      }
    } catch (error) {
      console.error('Cache set error:', error);
      // Don't throw - caching failures shouldn't break the function
    }
  }

  // Different TTLs for different function types
  static getTTL(functionName: string): number {
    const ttlMap: Record<string, number> = {
      'journal-reflect': 86400,     // 24 hours - reflections don't change
      'meal-analyze': 86400,        // 24 hours - meal analysis is stable
      'ai-chat': 0,                 // Don't cache chat responses
      'generate-summary': 3600,     // 1 hour - summaries can change as new data comes in
      'bulk-analyze': 604800,       // 1 week - historical analysis is stable
    };
    
    return ttlMap[functionName] || 3600; // Default 1 hour
  }
}