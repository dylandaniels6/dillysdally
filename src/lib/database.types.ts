export interface Database {
  public: {
    Tables: {
      journal_entries: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          date: string;
          title: string;
          content: string;
          mood: string;
          tags: string[];
          ai_reflection: string | null;
          context_data: any | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          date: string;
          title: string;
          content: string;
          mood?: string;
          tags?: string[];
          ai_reflection?: string | null;
          context_data?: any | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          date?: string;
          title?: string;
          content?: string;
          mood?: string;
          tags?: string[];
          ai_reflection?: string | null;
          context_data?: any | null;
          updated_at?: string;
        };
      };
      habits: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          date: string;
          title: string;
          description: string | null;
          frequency: string;
          target: number;
          progress: number;
          completed: boolean;
          color: string | null;
          completed_history: any | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          date: string;
          title: string;
          description?: string | null;
          frequency?: string;
          target?: number;
          progress?: number;
          completed?: boolean;
          color?: string | null;
          completed_history?: any | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          date?: string;
          title?: string;
          description?: string | null;
          frequency?: string;
          target?: number;
          progress?: number;
          completed?: boolean;
          color?: string | null;
          completed_history?: any | null;
        };
      };
      climbing_sessions: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          date: string;
          location: string;
          duration: number;
          notes: string | null;
          routes: any[];
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          date: string;
          location: string;
          duration?: number;
          notes?: string | null;
          routes?: any[];
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          date?: string;
          location?: string;
          duration?: number;
          notes?: string | null;
          routes?: any[];
        };
      };
      expenses: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          date: string;
          amount: number;
          description: string;
          category: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          date: string;
          amount: number;
          description: string;
          category: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          date?: string;
          amount?: number;
          description?: string;
          category?: string;
        };
      };
      income: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          date: string;
          amount: number;
          description: string;
          category: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          date: string;
          amount: number;
          description: string;
          category: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
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
          user_id: string;
          date: string;
          cash_accounts: number;
          liabilities: number;
          assets: number;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          date: string;
          cash_accounts?: number;
          liabilities?: number;
          assets?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          date?: string;
          cash_accounts?: number;
          liabilities?: number;
          assets?: number;
          notes?: string | null;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          text: string;
          completed: boolean;
          priority: number;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          text: string;
          completed?: boolean;
          priority?: number;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          text?: string;
          completed?: boolean;
          priority?: number;
          completed_at?: string | null;
        };
      };
      user_profiles: {
        Row: {
          user_id: string;
          created_at: string;
          updated_at: string;
          settings: any;
        };
        Insert: {
          user_id: string;
          created_at?: string;
          updated_at?: string;
          settings?: any;
        };
        Update: {
          user_id?: string;
          created_at?: string;
          updated_at?: string;
          settings?: any;
        };
      };
      ai_analysis_summaries: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          period_start: string;
          period_end: string;
          summary_type: string;
          content: string;
          metadata: any | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          period_start: string;
          period_end: string;
          summary_type: string;
          content: string;
          metadata?: any | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          period_start?: string;
          period_end?: string;
          summary_type?: string;
          content?: string;
          metadata?: any | null;
        };
      };
    };
    Functions: {
      get_clerk_user_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
    };
  };
}