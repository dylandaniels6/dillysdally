import { createHash } from "https://deno.land/std@0.208.0/crypto/mod.ts";

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export class OpenAIClient {
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = apiKey;
  }

  async createChatCompletion(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  }, retryCount = 0): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle rate limits with exponential backoff
        if (response.status === 429 && retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount);
          console.log(`Rate limited. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.createChatCompletion(params, retryCount + 1);
        }
        
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data;
      
    } catch (error) {
      // Network errors - retry with backoff
      if (retryCount < this.maxRetries && error.message.includes('fetch')) {
        const delay = this.retryDelay * Math.pow(2, retryCount);
        console.log(`Network error. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.createChatCompletion(params, retryCount + 1);
      }
      
      throw error;
    }
  }

  // Calculate cost based on model and tokens
  static calculateCost(model: string, usage: TokenUsage): number {
    // Prices per 1K tokens (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4.1-mini': { input: 0.00015, output: 0.0006 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'gpt-4': { input: 0.03, output: 0.06 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4.1-mini'];
    
    const inputCost = (usage.prompt_tokens / 1000) * modelPricing.input;
    const outputCost = (usage.completion_tokens / 1000) * modelPricing.output;
    
    return inputCost + outputCost;
  }
}

export const createOpenAIClient = (): OpenAIClient => {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAIClient(apiKey);
};

// Generate cache key from request
export const generateCacheKey = async (
  functionName: string,
  params: any,
  userId?: string
): Promise<string> => {
  const data = JSON.stringify({ functionName, params, userId });
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${functionName}_${hashHex.substring(0, 16)}`;
};