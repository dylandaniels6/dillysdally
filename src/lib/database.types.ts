export interface Database {
  public: {
    Tables: {
      journal_entries: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          date: string;
          title: string;
          content: string;
          mood: string;
          tags: string[];
          ai_reflection: string | null;
          context_data: any | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          date: string;
          title: string;
          content: string;
          mood: string;
          tags?: string[];
          ai_reflection?: string | null;
          context_data?: any | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          date?: string;
          title?: string;
          content?: string;
          mood?: string;
          tags?: string[];
          ai_reflection?: string | null;
          context_data?: any | null;
        };
      };
      habits: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          date: string;
          title: string;
          description: string | null;
          frequency: string;
          target: number;
          progress: number;
          completed: boolean;
          color: string | null;
          completed_history: any | null; // Added column
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          date: string;
          title: string;
          description?: string | null;
          frequency: string;
          target: number;
          progress: number;
          completed: boolean;
          color?: string | null;
          completed_history?: any | null; // Added column
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          date?: string;
          title?: string;
          description?: string | null;
          frequency?: string;
          target?: number;
          progress?: number;
          completed?: boolean;
          color?: string | null;
          completed_history?: any | null; // Added column
        };
      };
      climbing_sessions: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          date: string;
          location: string;
          duration: number;
          notes: string | null;
          routes: any[];
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          date: string;
          location: string;
          duration: number;
          notes?: string | null;
          routes?: any[];
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          date?: string;
          location?: string;
          duration?: number;
          notes?: string | null;
          routes?: any[];
        };
      };
      ai_analysis_summaries: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          period_start: string;
          period_end: string;
          summary_type: string;
          content: string;
          metadata: any | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          period_start: string;
          period_end: string;
          summary_type: string;
          content: string;
          metadata?: any | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          period_start?: string;
          period_end?: string;
          summary_type?: string;
          content?: string;
          metadata?: any | null;
        };
      };
      expenses: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          date: string;
          amount: number;
          description: string;
          category: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          date: string;
          amount: number;
          description: string;
          category: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          date?: string;
          amount?: number;
          description?: string;
          category?: string;
        };
      };
      net_worth_entries: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          date: string;
          cash_accounts: number;
          liabilities: number;
          assets: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          date: string;
          cash_accounts: number;
          liabilities: number;
          assets: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          date?: string;
          cash_accounts?: number;
          liabilities?: number;
          assets?: number;
        };
      };
      user_profiles: {
        Row: {
          user_id: string;
          created_at: string;
          settings: any; // jsonb type
        };
        Insert: {
          user_id: string;
          created_at?: string;
          settings?: any;
        };
        Update: {
          user_id?: string;
          created_at?: string;
          settings?: any;
        };
      };
    };
  };
}
