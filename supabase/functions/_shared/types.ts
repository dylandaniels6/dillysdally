export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  mood?: string;
  tags?: string[];
  context_data?: {
    habitData?: Record<string, any>;
    dayRating?: number;
    wakeTime?: string;
    sleepTime?: string;
    miles?: number;
    climbed?: boolean;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface APIResponse<T = any> {
  data?: T;
  error?: string;
  status: 'success' | 'error';
}